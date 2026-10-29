from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.database import get_connection

app = FastAPI(title="Task Manager API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None

class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    completed: bool | None = None

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Task Manager API"}


@app.get("/api/tasks")
def get_tasks():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, completed, created_at
                FROM tasks
                ORDER BY id
                """
            )

            rows = cur.fetchall()
            columns = [column.name for column in cur.description]

            return [
                dict(zip(columns, row))
                for row in rows
            ]

@app.get("/api/tasks/{task_id}")
def get_task(task_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, completed, created_at
                FROM tasks
                WHERE id = %s
                """,
                (task_id,),
            )

            row = cur.fetchone()

            if row is None:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )

            columns = [column.name for column in cur.description]
            return dict(zip(columns, row))


@app.post("/api/tasks", status_code=201)
def create_task(task: TaskCreate):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tasks (title, description)
                VALUES (%s, %s)
                RETURNING id, title, description, completed, created_at
                """,
                (task.title, task.description),
            )

            row = cur.fetchone()
            columns = [column.name for column in cur.description]

            return dict(zip(columns, row))

@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM tasks
                WHERE id = %s
                RETURNING id
                """,
                (task_id,),
            )

            deleted_row = cur.fetchone()

            if deleted_row is None:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )

    return None

@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    updates = task.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=422,
            detail="No fields provided for update",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, completed, created_at
                FROM tasks
                WHERE id = %s
                """,
                (task_id,),
            )
            row = cur.fetchone()

            if row is None:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )

            columns = [column.name for column in cur.description]
            current_task = dict(zip(columns, row))
            updated_task = {**current_task, **updates}

            cur.execute(
                """
                UPDATE tasks
                SET title = %s,
                    description = %s,
                    completed = %s
                WHERE id = %s
                RETURNING id, title, description, completed, created_at
                """,
                (
                    updated_task["title"],
                    updated_task["description"],
                    updated_task["completed"],
                    task_id,
                ),
            )

            row = cur.fetchone()
            columns = [column.name for column in cur.description]
            return dict(zip(columns, row))