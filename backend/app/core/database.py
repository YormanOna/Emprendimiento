from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# IMPORTANTE:
# Para async con MySQL (XAMPP), tu DATABASE_URL debe usar:
# mysql+aiomysql://usuario:contraseña@localhost:3306/nombre_bd
# Ejemplo: mysql+aiomysql://root@localhost:3306/cuidado_adulto_mayor
DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
