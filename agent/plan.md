# SpaceStation implementation plan

## Purpose

This plan translates the findings in exploration.md into a structured roadmap for reaching the full feature set described by the project background: a Tiled-driven game engine/plugin where map data defines gameplay, entities, UI, scene flow, and transition logic.

The goal is not just to finish the current demo, but to turn the codebase into a reusable framework that can generate game logic from Tiled map metadata and attach behavior through entity classes.

## Current state summary

The project already contains the foundation of the desired architecture:

- Tiled map loading through a custom Level base class
- Entity registration via EntityManager
- Scene abstraction and player state logic
- Interactable/trigger-based behaviors
- Object groups intended to map to entity classes

The missing work is mostly around integration and completion:

- making map-to-entity creation reliable and consistent
- consolidating data-driven scene and UI configuration
- formalizing entity lifecycle and behaviors
- separating reusable engine features from demo-specific code
- stabilizing tests and toolchain assumptions

## Strategic direction

The project should be developed in layers:

1. Engine core
   - Level runtime
   - map parsing
   - entity registry
   - object/type mapping
   - collision abstractions

2. Gameplay framework
   - entity classes for player, NPCs, pickups, triggers, doors, hazards
   - reusable physics and interaction contracts

3. Scene and UI system
   - declarative scene metadata
   - transition orchestration
   - configurable fonts and UI elements from map or config

4. Content authoring workflow
   - Tiled-first pipeline
   - data readability and validation
   - asset conventions for player, NPC, triggers, and environment

5. Quality and correctness
   - tests
   - build/runtime validation
   - cleanup of stale demo/unused code

## Milestone 1: stabilize the engine foundation

Status: Completed

### Objective

Make the runtime architecture consistent and reliable before adding more gameplay features.

### Work items

- Audit the base Level loader and confirm how it resolves assets, tilesets, and map layers.
- Standardize the Tiled map contract used across scenes.
- Fix the current mismatch between object properties, entity types, and class registration.
- Ensure each Tiled object is converted into a properly instantiated entity instance.
- Define a clear lifecycle for scene setup, preload, create, update, and teardown.
- Confirm collision and physics rules are applied consistently.

### Deliverables

- A stable base scene/runtime API that is not dependent on ad hoc scene code.
- A predictable way to declare map objects and their entity classes.
- Map loading with clear diagnostics for missing object types or invalid layer data.

### Acceptance criteria

- A Tiled JSON file can load into a scene without silent failures.
- Entity objects in object layers resolve to valid classes.
- Missing or unknown object types produce clear logs or explicit errors.
- The engine has a single consistent scene contract.

## Milestone 2: formalize entity model and registry behavior

Status: Completed

### Objective

Turn the current ad hoc entity pattern into a reusable entity system that supports map-driven logic.

### Work items

- Define a clear base entity abstraction for common gameplay behaviors.
- Separate static data, runtime state, and behavior responsibilities.
- Standardize entity constructors for map-instantiated objects.
- Build a reliable registry for entity classes and layer/object-type resolution.
- Add support for custom entity properties from Tiled object fields.
- Add lifecycle hooks such as `onSpawn`, `onCollide`, `onTrigger`, `onDestroy`, and `onSceneReady`.

### Deliverables

- A reusable entity model that all gameplay logic can extend.
- A registry system that supports object-type lookup and runtime instantiation.
- A clear pattern for map objects like spawn points, pickups, hazards, doors, and NPCs.

### Acceptance criteria

- Entity classes can be registered once and used across multiple levels.
- Object properties from Tiled can influence behavior without hand-written scene logic.
- Different entity types share a consistent contract and update cycle.

## Milestone 3: build a generic interaction and trigger system

Status: Completed

### Objective

Replace the prototype trigger system with a robust engine feature for map-defined interactions.

### Work items

- Consolidate trigger logic from the demo code and utility layer.
- Define reusable trigger zones and event semantics.
- Support overlap, collision, and custom map-defined triggers.
- Add a consistent API for door logic, switching scenes, activating objects, and collecting items.
- Define scene-level event emission and listener registration.

### Deliverables

- A generic trigger/event framework for gameplay interactions.
- A documented set of trigger behaviors usable by level designers.
- Data-driven object connections between triggers and actions.

### Acceptance criteria

- Trigger zones work without scene-specific code.
- Upstream event logic can drive UI updates, scene changes, or object state changes.
- Trigger behavior can be configured from map metadata or object properties.

## Milestone 4: implement data-driven scene and UI configuration

### Objective

Move scene, UI, font, and transition configuration beyond hardcoded scene classes and toward map- or config-driven definitions.

### Work items

- Define a scene configuration model for each level.
- Add support for configuring camera bounds, zoom, parallax background, UI panels, and transition rules.
- Define a lightweight UI abstraction for text, buttons, HUD elements, and overlays.
- Add support for fonts and typography metadata as versioned game assets/config.
- Specify how scene transitions are represented in data and triggered by events.
- Identify what should be runtime-configurable versus authoring-time-defined.

### Deliverables

- A scene definition system that can describe UI, camera, fonts, and transitions without hardcoded setup logic.
- A reusable UI layer that can be created by the engine rather than by each scene.
- A consistent scene transition API.

### Acceptance criteria

- A level can define key scene configuration without custom TypeScript setup beyond the scene class container.
- Fonts and text styling are managed through config or assets, not only ad hoc runtime code.
- A trigger can move between scenes or open overlays through a standardized transition flow.

## Milestone 5: create the reusable game-object library

### Objective

Expand the project beyond the player and demo collectible into a set of engine-supported object classes.

### Work items

- Create reusable classes for common gameplay pieces:
  - spawn points
  - pickups/collectibles
  - doors and locked exits
  - hazards
  - NPCs/actors
  - trigger zones
  - switches and toggles
- Standardize common properties like `name`, `type`, `enabled`, `tags`, `script`, and `interactionTarget`.
- Add default behaviors and extension hooks for custom objects.

### Deliverables

- A library of implemented entity classes ready to use in levels.
- A consistent pattern for adding brand new entity behaviors.
- A clear separation between generic engine objects and game-specific content.

### Acceptance criteria

- New levels can reuse existing object types without bespoke scene logic.
- Data-driven object configuration is enough to produce working gameplay behavior.
- Object classes are suitable for reuse across multiple maps.

## Milestone 6: clean up the demo layer and remove stale code

### Objective

Remove or isolate tutorial/demo code so the project behaves like a real engine foundation rather than an experimental playground.

### Work items

- Review unused or duplicate implementations such as test/demo scenes.
- Remove stale assumptions in tests and imports.
- Separate active engine code from tutorial experiments.
- Decide which files are part of the engine core and which are demo content (and keep them clearly separated).
- Rename or document legacy files that no longer match the actual architecture.

### Deliverables

- A clearer folder structure and explicit ownership of engine vs. example code.
- A smaller, more maintainable codebase.
- Reduced confusion between tutorial code and actual framework code.

### Acceptance criteria

- The source tree reflects the intended architecture.
- Current engine files are not mixed with one-off prototype work.
- New contributors can understand which files are framework code and which are examples.

## Milestone 7: establish testing, validation, and build health

### Objective

Bring the repository into a stable state that can support incremental development.

### Work items

- Fix stale tests and confirm they match the current code structure.
- Add tests for scene loading, entity registration, and trigger behavior.
- Add validation around Tiled map parsing and object resolution.
- Check build health with the current Vite/TypeScript configuration.
- Document the standard development workflow for local runs and testing.

### Deliverables

- A passing or at least consistently runnable test suite aligned to the current architecture.
- Build-time validation for TypeScript and bundling.
- Clear developer instructions for validating changes.

### Acceptance criteria

- The project can be built and run without obvious runtime errors from stale references.
- Tests cover the engine’s foundation rather than only placeholder scenarios.
- Contributors can run a minimal validation flow before merging work.

## Milestone 8: define the production-ready engine vision

### Objective

Translate the functional engine into a full plugin/game-engine model with a maintainable roadmap.

### Work items

- Define the public API of the engine and how external projects would use it.
- Document the level authoring pipeline from Tiled to runtime.
- Specify the supported object types and configuration patterns.
- Formalize scene transition rules and UI authoring data.
- Define how the engine can support future game projects beyond this prototype.

### Deliverables

- A clear blueprint for a reusable Phaser-based game engine plugin.
- Documentation that matches the intended design from the background statement.
- A roadmap for future feature work beyond the current prototype.

### Acceptance criteria

- The repository reads as a reusable engine/tooling project instead of a single game demo.
- Contributors understand how to extend the system with new map objects and scene behaviors.
- The project vision is documented in a way that supports future development.

## Suggested execution order

1. Stabilize the engine foundation
2. Formalize entity registry and object mapping
3. Build the interaction/trigger system
4. Add scene and UI configuration support
5. Expand reusable object library
6. Remove stale demo code
7. Fix tests and validation
8. Finalize the reusable engine/documentation plan

## Progress tracking checklist

Use the milestones above as checkpoints. A practical progress pattern is:

- [x] Milestone 1: stabilize engine foundation
- [x] Milestone 2: formalize entity model
- [x] Milestone 3: build trigger system
- [ ] Milestone 4: data-driven scene and UI config
- [ ] Milestone 5: reusable object library
- [ ] Milestone 6: cleanup stale demo code
- [ ] Milestone 7: testing and build validation
- [ ] Milestone 8: production engine vision

This checklist can be updated as work lands and used as a lightweight project tracker without requiring code changes at this stage.
