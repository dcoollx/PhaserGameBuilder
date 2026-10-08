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

Each Tiled object must name its intended Phaser game-object class in `class`; the registry resolves that class when creating the instance.

#### Tiled layer and object mapping

- Tile layers become Phaser `TilemapLayer` objects.
- Image layers become Phaser images, or repeating tile sprites when Tiled repeat is enabled. Group-layer visibility, opacity, offsets, and image-layer parallax are applied.
- Every object in a Tiled object layer must define a `class` matching a registered game-object constructor. The selected constructor determines the Phaser object type; the engine does not infer it from Tiled shape fields or legacy `type`.
- For tile objects (objects with a `gid`), the resolved texture and frame are passed to the registered constructor. Tiled dimensions, flips, rotation, visibility, and properties are applied to the resulting object.
- Object geometry and properties are retained as Phaser data under `tiledObject` and `tiledProperties`.
- Missing classes, unregistered classes, and malformed tile references fail with actionable errors.

The built-in `Spawn` and `Door` game objects are registered with the entity registry:

- `Spawn`: an invisible zone named after the Tiled object, with its polygon geometry preserved. Set the boolean custom property `engine.debugVisible` to `true` to draw its outline.
- `Door`: a tile-backed Arcade sprite with locked/open state behavior. Read or change the door state with `gameObject.getData('door')`, `setLocked()`, `setOpen()`, and `toggleOpen()`.

Other built-in properties use namespaced custom names:

| Property | Type | Meaning |
| --- | --- | --- |
| `engine.door.locked` | boolean | Initial locked state; defaults to `true`. |
| `engine.door.open` | boolean | Initial open state; defaults to `false`. |
| `engine.physics` | string | `static` or `dynamic` Arcade body for visible shapes and tile objects. |
| `engine.physics.gravity` | boolean | Whether a dynamic Arcade body is affected by gravity; defaults to `true`. |
| `engine.visual.alpha` | float | Initial object alpha from `0` to `1`. |
| `engine.debugVisible` | boolean | Draw the outline of a `Spawn` zone. |

Register each Tiled object class with the entity registry. Constructors for tile objects receive the resolved texture and frame as constructor arguments, just like a Phaser sprite; classes with nonstandard constructor contracts can provide a `createFromTiledObject` factory.

### Notes for map authors

- Keep map-level settings on the map root, not in scene code.
- Set every Tiled object `class` to the name of its registered game-object class; legacy `type` and custom properties do not select entity classes.
- The `ui` field should reference a registered scene/entity rather than embedding scene configuration inline.
- If an object has an unrecognized or missing class, the engine reports an error instead of inferring a Phaser object from its geometry.
- Any future UI, scene-transition, or game-logic settings should be represented in Tiled metadata so the runtime remains data-driven.
