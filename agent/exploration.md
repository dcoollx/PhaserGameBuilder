# SpaceStation exploration

## Executive summary

This repository is a Phaser 3 TypeScript prototype that is trying to evolve from a simple game into a map-driven game engine/plugin. The clearest architectural idea in the code is that gameplay is intended to be defined primarily by Tiled map data, with game objects and logic discovered by type and instantiated from map objects instead of hardcoded scene logic.

In other words, the project is aiming for a design like this:

- Tiled exports a map/JSON definition.
- A custom scene/level loader reads that file.
- Game objects in the map are mapped to JavaScript classes.
- Entities encapsulate behavior for that object type.
- Scene, UI, camera, and transition details are meant to be editable through the level data instead of only in code.

The repo has the right conceptual foundation for that direction, but it is still a prototype and not yet a complete engine layer. Several parts are unfinished, partially duplicated, or stale relative to the current file structure.

## Project setup and delivery model

The app is configured as a Vite + Phaser game, with TypeScript enabled and Jest used for limited unit testing.

Key config files:

- package.json: Vite + Phaser + TypeScript + Jest setup.
- vite.config.ts: simple Vite config with the dev server on port 5173.
- tsconfig.json: strict TypeScript with Phaser types and allowJs enabled.
- jest.config.ts: Jest set up for jsdom and image mocks.

This makes the project a browser game shell with frontend tooling, not a full production game engine yet.

## Entry points and runtime flow

### src/main.ts

This is the app bootstrap.

- It imports Menu, TestLevel, and TutorialLevel.
- It creates a default Phaser game config with arcade physics.
- It sets the scale to a target device ratio via setTargetSize().
- It registers TutorialLevel as the active scene in the config.
- It instantiates the custom Game class.

The boot flow is simple and consistent with a prototype runtime that starts immediately in a scene.

### src/utilities/Game.ts

This class extends Phaser.Game and adds a debug window exposure:

- if debug is true, it assigns `window.game` and `window.scene` for quick inspection.

This is a lightweight game-shell wrapper, not a complex engine core.

## Scene architecture

### Base scene abstraction: src/utilities/Level.ts

This is the most important file in the codebase. It acts as the level abstraction and is the closest thing to an engine foundation.

Responsibilities:

- Creates and stores a Tiled map via `this.map = this.make.tilemap({ key: this.mapName })`.
- Loads the level JSON through `this.load.json()` and `this.load.tilemapTiledJSON()`.
- Reads all tilesets from the Tiled file and loads them as textures/spritesheets.
- Parses image layers and tile layers from the map.
- Looks through object layers and tries to instantiate map objects by object type.
- Uses the object type name to resolve a class from a central registry.
- Builds collision layers based on tile properties, specifically `isSolid`.
- Sets camera bounds and background image parallax behavior.

This is where the “extract gameplay logic from Tiled maps” concept is most visible.

The pattern is:

- Tiled object groups define entities.
- Each object has a `type`.
- `EntityManager.get(object.type)` resolves the matching class.
- `this.map.createFromObjects` is used to instantiate those objects.

That is a strong indication that the project was intended to be a data-driven engine rather than a hand-coded game.

### Scene implementations

#### src/scenes/levels/TestLevel.ts

This is a concrete playable test scene:

- Loads assets for the player and a theme music file.
- Calls `super.create()` from the Level base.
- Sets world bounds and gravity.
- Creates a Player object and collides it with the collision layer.
- Uses `this.sound.play('theme', { loop: true })`.
- Sets camera zoom.

This file behaves like a current validation/test scene rather than the final production scene.

#### src/scenes/levels/PhaserTutorial.level.ts

This file is a tutorial/demo level implementation and appears to be a proof of concept:

- Uses the same Level base infrastructure.
- Loads player sprites.
- Spawns a player from a zone named `player`.
- Adds overlap collision with interactables such as stars.
- Creates a HUD text object with a score.
- Calls `Star.update()` and invokes `Spawn.needToFix()`.

The code suggests experimentation and partial migration from a tutorial-style implementation toward a generic map-based engine.

#### src/scenes/menu/Menu.ts

This is a menu scene prototype:

- Loads a rotating planet sprite sheet.
- Displays a title text.
- Clicking the title starts a level scene.
- The scene is not presently the default boot scene in main.ts, which means it may be leftover or inactive.

## Entity and registry system

### src/utilities/EntityManager.ts

This is the core registry layer for map-driven entity behavior.

- `EntityManager.list` is a `Map<string, EntityConstructor<...>>` keyed by constructor name.
- `EntityManager.register(constructor)` stores classes.
- `EntityRegister` is a decorator-like wrapper used to mark classes as available for map object creation.

This makes the project resemble an engine registry pattern, where entity types are registered and then resolved by name at runtime.

### src/entities/Entity.ts

This is a base sprite abstraction.

- It extends `Phaser.Physics.Arcade.Sprite`.
- It adds a helper for animation creation via `addAnimation()`.
- It automatically adds itself to the scene’s display list in the constructor.

The structure is intentionally generic, which supports future entity classes.

### src/entities/Character.ts

A thin subclass of Entity with no extra logic beyond inheritance.

This suggests the project intends to build a hierarchy of game-specific entity types over a common sprite base, but it has not yet expanded much beyond the base abstraction.

### src/entities/Player.ts

This is the main gameplay entity and the clearest implementation of the game logic.

- Extends Character.
- Creates physics body on the scene.
- Follows the camera.
- Handles movement with keyboard input.
- Uses `typestate` to handle a finite state machine with states including idle, run, jump, falling, climb, and hang.
- Plays animations for idle, jump, fall, and run.
- Updates velocity and state transitions in `update()`.

This is a strong sign that the repo was intended to build a reusable component model for gameplay entities, while still using Phaser under the hood.

### src/entities/Spawn.ts

This file declares a map object class that extends `Phaser.GameObjects.Zone`.

- It is decorated with `@EntityRegister`.
- It is intended to act as a spawn point or logic trigger location.
- It contains a note: `needToFix()` with a comment about importing objects without refs.

This confirms the project is still wrestling with how Tiled-defined spawn/trigger objects should be loaded and linked to their classes.

## Interactables and triggers

### src/utilities/Interactables.ts

This file defines a trigger framework.

- `Trigger` is an interface for objects that respond to events.
- `BaseTrigger` is an abstract class.
- `TriggerZone` creates a physics overlap region and stores event handlers.
- `setOnTrigger()` registers callbacks.
- `onTrigger()` runs all registered callbacks.

This is a promising abstraction for map-driven UI/game events, object interactions, and zone-based triggers. It is closely aligned with the engine vision but still not fully integrated with Tiled map data in a complete way.

### src/entities/demo/Star.ts

This is a demo interactable entity.

- It extends `Phaser.Physics.Arcade.Sprite`.
- It registers itself as an entity with the manager.
- It adds itself to `scene.interactables` when created.
- It handles overlap by disabling itself and updating a score text.

This file acts as a working example of how collectible objects and scene logic could be driven from Tiled objects and entity classes.

## Asset and map layer approach

### public/assets

The repo includes a simple asset layout for levels and player art:

- public/assets/testlevel/test.json
- public/assets/demolevel/
- public/assets/player/
- public/assets/sounds/

The level JSON looks like a Tiled map export, which matches the design goals of the project. That tilemap is the backbone of the engine prototype.

### Level file loading behavior

The base Level loader is designed to read a JSON export from Tiled and register map data automatically. This is the central abstraction aligning the project to the idea of a map-driven engine.

It supports:

- tileset loading
- background image layers
- object layers for entity definitions
- collision layers based on tile properties

This is the strongest evidence that the author intended to generalize game creation around map content.

## UI, fonts, scenes, and transitions

The background statement from the user describes a broader ambition: being able to edit UI, fonts, scenes, and scene transitions from the Tiled map configuration.

The current codebase only partially reflects that:

- There is no explicit UI configuration system beyond a score text object created in code.
- There is no abstraction for fonts or design tokens loaded from Tiled metadata.
- There is no scene transition manager in the main engine layer.
- The scene system is still primarily code-defined in `Scene` classes rather than data-defined from map metadata.

So the architecture is conceptually aligned with that goal, but the implementation is still a prototype rather than a finished plugin/game engine.

## Observation on responsiveness and device support

### src/utilities/device.ts

This utility calculates a target viewport size based on an aspect ratio.

- `getAspectRatio()` calculates the screen ratio using `screen.width` and `screen.height`.
- `setTargetSize()` computes a width/height pair to fit the viewport while preserving aspect ratio.

This is a basic but sensible cross-device scaling helper.

## Test and validation status

The repo contains Jest-based tests for device and game startup:

- test/__tests__/unit/devices.spec.js
- test/__tests__/unit/game.spec.js
- test/__tests__/unit/player.spec.js

However, the tests appear to be stale or partially broken:

- game.spec.js uses `it.only`, which will force that test to run alone.
- player.spec.js imports paths that do not match the current project layout.
- There are references to `src/utilities/Player` and `src/scenes/levels/test_level/test_level`, which do not correspond to the current files.

This suggests the project has not been fully maintained or migrated after the refactor to the current scene/entity layout.

## Strengths of the codebase

- Clear separation between scenes, entities, and utilities.
- Map-driven design with a central entity registry.
- Direct use of Tiled for level content.
- Collision and overlap systems built into the scene lifecycle.
- A real state machine for player movement and transitions.

## Weaknesses and unfinished areas

- The engine abstraction is not complete; much of the generic logic remains experimental.
- Several files look like transitional or tutorial code rather than production code.
- Map object resolution is present but not fully stabilized.
- Scene transitions, UI configuration, and font/metadata management are not implemented at the level described in the project background.
- The project still depends on explicit scene classes rather than a fully declarative map-based configuration layer.
- Tests are not aligned with the current architecture.
- Some code has comments or placeholders indicating missing implementation (for example `Spawn.needToFix()`).

## Conclusion

This is not yet a polished game engine. It is a promising Phaser prototype that is structurally headed toward a Tiled-driven, class-based entity system. The architecture strongly reflects the intended vision: read game logic from a Tiled map, instantiate entity classes by map object type, and make scene content editable through level metadata.

At the moment, the repository is better described as a draft engine framework and a demo game prototype rather than a finished game or plugin. The core ideas are present, but the abstraction boundary is not complete, and several rough edges remain before it can be called a robust reusable engine.
