# Module 0 — Motivating Example

Before any definitions, build the thing that's broken and *feel* why auth exists. This is a paper
exercise — you can build it for real in five minutes if you want, but the point lands either way.

## The API

A tiny task-list service, "TaskFlow." One entity, one controller, zero auth:

```java
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired private TaskRepository taskRepository;

    @PostMapping
    public Task create(@RequestBody Task task) {
        return taskRepository.save(task);
    }

    @GetMapping("/{id}")
    public Task get(@PathVariable String id) {
        return taskRepository.findById(id).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) {
        taskRepository.deleteById(id);
    }
}
```

Each `Task` has an `ownerId` field, set by... nothing, currently. It's just a column that exists.

## What's actually wrong here

Anyone who can reach this API — no login, no credentials, nothing — can:

- `GET /api/tasks/507f191e810c19729de860ea` for *any* id and read a task that isn't theirs, just by
  guessing or incrementing an id
- `DELETE /api/tasks/507f191e810c19729de860ea` and destroy someone else's data the same way
- `POST /api/tasks` with `{"ownerId": "someone-elses-id", ...}` and create data *as* another user,
  because nothing checks who's asking

Notice this isn't a bug in the code above — the code does exactly what it says. The bug is what's
**missing**: there is no concept of "who is making this request" anywhere in the system, and even if
there were, there's no concept of "is this identified caller allowed to touch this specific task."

## The two questions, separated

Fixing this requires answering two genuinely different questions, and it's worth separating them now
because the whole rest of this tutorial is organized around the split:

1. **Authentication (AuthN) — "who is making this request?"**
   Some mechanism must let the server say, with confidence, "this request comes from user X" (or
   "this request is anonymous"). Nothing below matters until this question has an answer.

2. **Authorization (AuthZ) — "is user X allowed to do this?"**
   Once you know *who*, you still need a separate rule: is X allowed to `DELETE` *this specific*
   task? A logged-in, verified, 100%-authenticated user can still be forbidden from an action — an
   authenticated stranger deleting *your* task is still wrong, even though the server now knows
   exactly who they are.

A system can have authentication with no authorization (everyone who logs in can do everything — rare,
usually a mistake) or, in principle, authorization checks with no real authentication (trusting a
client-supplied "I am admin" flag — this is effectively broken authentication wearing an authorization
costume, and it's a real, common vulnerability class). They are two locks, and both need a key.

Everything from here on is: how do you build the mechanism that answers "who," and the mechanism that
answers "allowed to do what."

## Checkpoint questions

1. In the `TaskController` above, which specific line(s) would authentication fix, and which would
   still be broken even after authentication is added?
2. Give an example (not from this doc) of a system with authentication but a real authorization bug.
3. Why is "the client sends `ownerId` in the request body and the server trusts it" not a valid
   substitute for authentication?
