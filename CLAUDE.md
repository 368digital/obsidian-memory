# obsidian-memory

## Session Tracking (ОБЯЗАТЕЛЬНО)

При КАЖДОЙ сессии:

### Старт сессии (первое сообщение):
1. Проверь `claude-memory/.changed` — если есть, прочитай и обработай изменения из Obsidian
2. Прочитай `claude-memory/MEMORY.md` — загрузи контекст
3. Создай файл сессии: `claude-memory/sessions/{YYYY-MM-DD HH-mm} — {Описание}.md`

### В процессе работы:
- Записывай ключевые решения, файлы, коммиты в файл сессии
- Все memory-операции — через `claude-memory/`, НЕ через `~/.claude/projects/.../memory/`

### Завершение сессии:
- Обнови статус сессии: `status: completed`
- Добавь `## Следующие шаги`
- Обнови `claude-memory/MEMORY.md` индекс
