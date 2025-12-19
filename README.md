# reservation-app

Desk booking app with a React frontend and ASP.NET Core backend.

## Features
- 2D desk plan with zoom/pan, hover tooltips, and keyboard navigation
- Quick filters (search, free-only, mine, by zone)
- Side panel with actions and quick reserve
- Profile page with reservation history
- High contrast mode and focus-visible styling

## Tech stack
- React 19 + Vite + TypeScript + Tailwind CSS
- react-konva for the 2D plan
- Heroicons for UI icons
- ASP.NET Core 8 + EF Core (InMemory) + AutoMapper

## Project layout
- frontend/ - React app
- frontend/DeskBooking.Api/ - ASP.NET Core API
- frontend/DeskBooking.Api/DeskBooking.Api.Tests/ - backend tests

## Getting started
### Backend
```bash
cd frontend/DeskBooking.Api
dotnet restore
dotnet run
```
The API prints the local URL in the console (Swagger is at /swagger).

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tests
### Frontend
```bash
cd frontend
npm test
```

### Backend
```bash
dotnet test frontend/DeskBooking.Api/DeskBooking.Api.Tests/DeskBooking.Api.Tests.csproj
```
