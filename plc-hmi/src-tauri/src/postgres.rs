use sqlx::{Pool, Postgres, postgres::PgPoolOptions};
use std::time::Duration;

pub struct PgDatabase {
    pub pool: Pool<Postgres>,
}

impl PgDatabase {
    pub async fn connect(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .min_connections(1)
            .acquire_timeout(Duration::from_secs(10))
            .idle_timeout(Duration::from_secs(30))
            .max_lifetime(Duration::from_secs(300))
            .test_before_acquire(true)
            .connect(database_url)
            .await?;
        
        // Teste básico da conexão
        sqlx::query("SELECT 1").execute(&pool).await?;
        
        Ok(Self { pool })
    }
    
    /// Teste simples para verificar se a conexão está funcionando
    pub async fn test_connection(&self) -> Result<(), sqlx::Error> {
        sqlx::query("SELECT current_timestamp").execute(&self.pool).await?;
        Ok(())
    }
}

// Exemplo de função para inserir um valor de tag
pub async fn insert_tag_value(
    pool: &Pool<Postgres>,
    tag: &str,
    value: f64,
    timestamp: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO tag_values (tag, value, timestamp) VALUES ($1, $2, $3)"
    )
    .bind(tag)
    .bind(value)
    .bind(timestamp)
    .execute(pool)
    .await?;
    Ok(())
}
