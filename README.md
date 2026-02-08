# lifetrack

The is idea is track learning activities and gather stats overtime.

Main features:

- Register a new activity, github commits like view for each (120 days).
- Query, search, modify activities.
- Be able to construct interactively a learning path (DAG) from the activities
- Start a learning session, end it. Gather stats of sessions. Like total time per day/week/month/year
- Gloabl calendar of activities, scheduling meachanism. Calendar should be generic and not depend solenly on skills/activites. But ruther be generic to any kind of even and provide notifiecation functionality via telegram bot. It should autimatically pick up learning plan/skills. Also might be potentialy integrated with gmail colendar.
- Backend API to manage everything
- A telegram bot which can manage everything via backend API. User provides instructions in plain text and bot handles it via API. That should be simple enough so that even simple on device LLM model be able to handle it. So LLM reads the prompt, triggers right API and perpares the response.

This can be extended.

The stack is: 

- NextJS on the frontend. Vite for builds/development. Bun as runtime.
- Go on the backend. GraphQL for the API.
- PostgreSQL for the primary database

One of the objectives is also lear Go/Next js on the way so comments, extended docs are welcome.
