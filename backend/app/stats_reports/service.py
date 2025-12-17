# app/stats_reports/service.py
import os
from datetime import datetime, date, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.meds.models import IntakeLog, IntakeStatus
from app.stats_reports.models import ReportJob, ReportStatus
from app.core.config import settings


async def compute_stats(db: AsyncSession, senior_id: int, from_dt: datetime, to_dt: datetime):
    q = (
        select(IntakeLog.status, func.count(IntakeLog.id))
        .where(IntakeLog.senior_id == senior_id)
        .where(IntakeLog.scheduled_at >= from_dt, IntakeLog.scheduled_at <= to_dt)
        .group_by(IntakeLog.status)
    )
    res = await db.execute(q)
    counts = {status.value: cnt for status, cnt in res.all()}

    taken = counts.get(IntakeStatus.TAKEN.value, 0)
    missed = counts.get(IntakeStatus.MISSED.value, 0)
    late = counts.get(IntakeStatus.LATE.value, 0)
    skipped = counts.get(IntakeStatus.SKIPPED.value, 0)
    total = taken + missed + late + skipped
    adherence = (taken / total) if total else 0.0

    return {
        "total_intakes": total,
        "taken": taken,
        "missed": missed,
        "late": late,
        "skipped": skipped,
        "adherence_rate": adherence,
    }


async def create_report_job(db: AsyncSession, senior_id: int, range_start: date, range_end: date) -> ReportJob:
    job = ReportJob(senior_id=senior_id, range_start=range_start, range_end=range_end, status=ReportStatus.PENDING)
    db.add(job)
    await db.flush()
    return job


async def get_report_job(db: AsyncSession, report_id: int) -> ReportJob | None:
    res = await db.execute(select(ReportJob).where(ReportJob.id == report_id))
    return res.scalar_one_or_none()


# MVP: “simula” que se genera y queda READY con file_url dummy.
# Luego lo cambias por Celery + PDF real.
async def finalize_report_dummy(db: AsyncSession, job: ReportJob):
    job.status = ReportStatus.READY
    job.file_url = f"/downloads/reports/{job.id}.pdf"
    await db.flush()


async def finalize_report_pdf(db: AsyncSession, job: ReportJob):
    """Genera un reporte HTML real y lo guarda en disco."""
    try:
        # Crea directorio si no existe
        os.makedirs(settings.REPORTS_DIR, exist_ok=True)
        html_path = os.path.join(settings.REPORTS_DIR, f"report_{job.id}.html")

        # Calcula stats con fechas completas
        from_dt = datetime(job.range_start.year, job.range_start.month, job.range_start.day, tzinfo=timezone.utc)
        to_dt = datetime(job.range_end.year, job.range_end.month, job.range_end.day, 23, 59, 59, tzinfo=timezone.utc)
        stats = await compute_stats(db, job.senior_id, from_dt, to_dt)

        # Genera HTML
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Cuidado</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                h1 {{ color: #333; }}
                h2 {{ color: #666; margin-top: 30px; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .adherence {{ font-weight: bold; color: #0066cc; }}
            </style>
        </head>
        <body>
            <h1>Reporte de Cuidado</h1>
            <p><strong>Senior ID:</strong> {job.senior_id}</p>
            <p><strong>Rango:</strong> {job.range_start} a {job.range_end}</p>
            
            <h2>Estadísticas de Medicación</h2>
            <table>
                <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                </tr>
                <tr>
                    <td>Total de tomas</td>
                    <td>{stats['total_intakes']}</td>
                </tr>
                <tr>
                    <td>Tomadas</td>
                    <td>{stats['taken']}</td>
                </tr>
                <tr>
                    <td>Tardías</td>
                    <td>{stats['late']}</td>
                </tr>
                <tr>
                    <td>Omitidas</td>
                    <td>{stats['missed']}</td>
                </tr>
                <tr>
                    <td>Saltadas</td>
                    <td>{stats['skipped']}</td>
                </tr>
                <tr>
                    <td class="adherence">Adherencia</td>
                    <td class="adherence">{stats['adherence_rate']:.2%}</td>
                </tr>
            </table>
        </body>
        </html>
        """

        # Guarda HTML
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        # Actualiza job
        job.status = ReportStatus.READY
        job.file_url = f"/api/v1/reports/{job.id}/download"
        job.error = None
        await db.flush()

    except Exception as e:
        job.status = ReportStatus.FAILED
        job.error = str(e)
        await db.flush()