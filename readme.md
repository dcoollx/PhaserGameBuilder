# SpaceStation :star:

## Prepare for use

- Run `yarn install`
- Run `yarn start`

## Contributing

In order to contribute, clone this repo and create your own feature branch. Open a pull request and request a review; all PRs require at least one other dev approval.
During the PR process, Vercel will give you a link to a temporary deployment of the app.
On approval and merge to main, your changes will automatically deploy to Vercel. This usually takes 10-15 minutes to update the main link :rocket:

### Short-cut to pushing to GitHub
- Run `yarn run push "my message"`

## Description

You are the lone operator of a small salvage vessel who arrives at an abandoned space station.
What happened to the crew? Why is the power out? Find out!

## Map and object metadata contract

This project is designed to be driven by Tiled map metadata. The engine reads custom properties from the map root and from individual object definitions to configure scene behavior and entity logic.

### Map-level custom properties

The following properties are expected to be placed on the root Tiled map object (the map itself):

- `gravity`: object with numeric `x` and `y` values, for example `{ "x": 0, "y": 700 }`
- `cameraZoom`: number, for example `1` or `2`
- `backgroundColor`: hex or CSS color string, for example `#000000` or `blue`
- `ui`: string naming a registered UI scene/entity to instantiate, for example `ScoreHud` or `InventoryHud`
- `uiPosition`: optional object with `x` and `y` values used to position the UI object
- `uiData`: optional object containing initial data passed to the UI scene/entity when it is created
- `transition`: optional transition metadata object, for example:
  ```json
  { "nextScene": "next_level", "duration": 500, "type": "fade" }
  ```

These values are consumed by the `Level` base class during scene creation.

### UI scene contract

The `ui` property should not be an inline array of scene descriptors. Instead, it should reference a registered scene/entity name. The engine should resolve that name via the `EntityManager`, create the instance, and pass optional positional arguments from `uiPosition` and `uiData`.

Conceptually, the runtime should behave like this:

- `ui = "ScoreHud"`
- the engine resolves `ScoreHud` from the entity registry
- the UI object is instantiated with the scene and any optional position data
- `uiPosition` and `uiData` provide initial placement and state information

This keeps the UI system aligned with the rest of the data-driven entity pattern used throughout the project.

### Object-level custom properties

Tiled object entities are expected to include properties that match the runtime entity class they are meant to instantiate.

Common expectations:

- `type`: the registered entity name, for example `Player`, `Star`, or `Spawn`, this is set within Tiled as `class` property
- `name`: optional identifier used for lookup and event binding
- custom properties on the object: any additional metadata used by entity logic, such as:

Custom properties beyond the common ones should be namespaced to avoid collisions across multiple entity types.
  - `spawnName`
  - `isSolid`
  - `tags`
  - `destinationScene`
  - `interactionTarget`
  - `script`
  - `enabled`

The engine reads object properties via `EntityManager.propertiesFromObject()` and attaches them to the instantiated entity instance as `entityProperties`.

### Notes for map authors

- Keep map-level settings on the map root, not in scene code.
- Prefer using Tiled object `type` and custom properties to define entity behavior.
- The `ui` field should reference a registered scene/entity rather than embedding scene configuration inline.
- If an object has no matching registered entity class, the engine logs the object type and skips instantiation.
- Any future UI, scene-transition, or game-logic settings should be represented in Tiled metadata so the runtime remains data-driven.

