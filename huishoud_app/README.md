# Thuis – Huishoudbeheer

React + TypeScript + Tailwind CSS + Lucide. Data staat in LocalStorage (sleutel `huishoud-app:v1`).

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + productiebuild in dist/
```

## Structuur

```
src/
  types.ts              datamodel (User, Room, Task)
  lib/dates.ts          datumhulpfuncties (maand/weekraster, NL-formaten)
  lib/storage.ts        LocalStorage, standaardruimtes, avatar-upload (resize)
  store/AppContext.tsx  state + CRUD-acties, sync tussen tabbladen
  components/           Avatar, Modal, TaskModal, TaskRow, FilterBar
  pages/                Dashboard, CalendarPage, TasksPage, UsersPage, RoomsPage
```
