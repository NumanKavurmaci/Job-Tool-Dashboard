# Dashboard Docs

These docs are written for AI-first navigation.

Goal:
- let a coding agent understand where dashboard logic lives
- reduce unnecessary codebase scanning
- make it obvious which page, component, or data reader to edit next

Start with:
- [FILE_MAP.md](../docs\FILE_MAP.md)

Suggested navigation order:
1. read `app/` to understand page boundaries
2. read `src/components/dashboard/` to understand section-level UI composition
3. read `lib/` to understand how the dashboard reads engine data
4. read `tests/` to see the intended behaviors and protected rendering rules
