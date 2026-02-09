# LinkOS

LinkOS is a "native-grade" personal assistant and butler for your digital life.

## Vision

LinkOS aims to be a local-first, privacy-focused agent that understands your screen and voice to automate tasks and manage your digital life.

## Tech Stack

- **UI / Orchestrator**: Electron + Preact (TypeScript)
- **AI Runtime**: Python (FastAPI/WebSockets)
- **Communication**: Local WebSocket
- **Automation**: Playwright (Web), UIAutomation (Windows)

## Project Structure

- `apps/desktop`: Electron application
- `runtimes/python`: Python AI Runtime
- `packages/`: Shared libraries
- `resources/`: Embedded resources (Python, uv)

## Getting Started

1.  **Install Dependencies**:
    ```bash
    yarn install
    ```

2.  **Initialize Python Runtime**:
    ```bash
    cd runtimes/python
    uv sync
    ```

3.  **Start Development**:
    ```bash
    yarn dev
    ```