
const API_URL = "/api/tasks";

const taskForm = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const descriptionInput = document.querySelector("#task-description");
const taskList = document.querySelector("#task-list");
const statusMessage = document.querySelector("#status-message");
const refreshButton = document.querySelector("#refresh-tasks");

function showMessage(message) {
    statusMessage.textContent = message;
}

async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        let message = `HTTP ${response.status}`;

        try {
            const errorData = await response.json();
            message = errorData.detail ?? message;
        } catch {
            // Ответ не содержит JSON — оставляем HTTP-ошибку.
        }

        throw new Error(message);
    }

    // DELETE возвращает HTTP 204 без тела ответа.
    if (response.status === 204) {
        return null;
    }

    return response.json();
}

async function loadTasks() {
    showMessage("Загружаем задачи...");

    try {
        const tasks = await request(API_URL);
        renderTasks(tasks);

        showMessage(
            tasks.length === 0
                ? "Пока задач нет. Создай первую!"
                : `Задач в списке: ${tasks.length}`
        );
    } catch (error) {
        showMessage(`Не удалось загрузить задачи: ${error.message}`);
    }
}

function renderTasks(tasks) {
    taskList.replaceChildren();

    for (const task of tasks) {
        const item = document.createElement("li");
        item.className = "task-item";

        const heading = document.createElement("h3");
        heading.textContent = task.title;

        const description = document.createElement("p");
        description.textContent = task.description || "Без описания";

        const state = document.createElement("p");
        state.textContent = task.completed
            ? "Статус: выполнена"
            : "Статус: в работе";

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const completeButton = document.createElement("button");
        completeButton.type = "button";
        completeButton.textContent = task.completed
            ? "Вернуть в работу"
            : "Выполнить";

        completeButton.addEventListener("click", async () => {
            try {
                await request(`${API_URL}/${task.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        completed: !task.completed,
                    }),
                });

                await loadTasks();
            } catch (error) {
                showMessage(`Не удалось изменить статус: ${error.message}`);
            }
        });

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Редактировать";
        editButton.className = "secondary-button";

        editButton.addEventListener("click", async () => {
            const newTitle = prompt("Название задачи:", task.title);

            if (newTitle === null) {
                return;
            }

            const newDescription = prompt(
                "Описание задачи:",
                task.description ?? ""
            );

            if (newDescription === null) {
                return;
            }

            try {
                await request(`${API_URL}/${task.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: newTitle,
                        description: newDescription,
                    }),
                });

                await loadTasks();
            } catch (error) {
                showMessage(`Не удалось отредактировать задачу: ${error.message}`);
            }
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Удалить";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", async () => {
            const confirmed = confirm(
                `Удалить задачу «${task.title}»?`
            );

            if (!confirmed) {
                return;
            }

            try {
                await request(`${API_URL}/${task.id}`, {
                    method: "DELETE",
                });

                await loadTasks();
            } catch (error) {
                showMessage(`Не удалось удалить задачу: ${error.message}`);
            }
        });

        actions.append(
            completeButton,
            editButton,
            deleteButton
        );

        item.append(
            heading,
            description,
            state,
            actions
        );

        taskList.append(item);
    }
}

taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const task = {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim() || null,
    };

    if (!task.title) {
        showMessage("Название задачи не может быть пустым.");
        titleInput.focus();
        return;
    }

    try {
        await request(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(task),
        });

        taskForm.reset();
        showMessage("Задача создана.");

        await loadTasks();
    } catch (error) {
        showMessage(`Не удалось создать задачу: ${error.message}`);
    }
});

refreshButton.addEventListener("click", loadTasks);

// Получаем список при открытии страницы.
loadTasks();
