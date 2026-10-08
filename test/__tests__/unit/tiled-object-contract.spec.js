import { EntityManager } from '../../../src/utilities/EntityManager';
import { Door } from '../../../src/entities/interactables/Doors';
import {
  getTiledObjectClass,
  resolveTiledTileAsset,
} from '../../../src/utilities/TiledObjectData';

describe('Tiled object runtime contract', () => {
  it('passes resolved tile texture and frame to registered sprite constructors', () => {
    class TiledSpriteExample {
      constructor(...args) {
        this.args = args;
      }
    }

    EntityManager.register(TiledSpriteExample);
    const scene = {};
    const object = { class: 'TiledSpriteExample', type: 'NotTheClass', x: 12, y: 34 };
    const sprite = EntityManager.createFromObject(scene, object, { texture: 'station-tiles', frame: 4 });

    expect(sprite.args).toEqual([scene, 12, 34, 'station-tiles', 4]);
  });

  it('attaches reusable locked/open behavior to a Phaser visual', () => {
    const door = Object.create(Door.prototype);
    Object.assign(door, {
      gameObject: door,
      locked: false,
      open: false,
      body: { enable: true },
      setAlpha: jest.fn(),
      setVisible: jest.fn(),
    });

    expect(door.locked).toBe(false);
    expect(door.toggleOpen()).toBe(true);
    expect(door.setVisible).toHaveBeenLastCalledWith(false);
    expect(door.body.enable).toBe(false);
    expect(EntityManager.get('Door')).toBe(Door);
  });

  it('uses only the Tiled class field to identify registered entity classes', () => {
    expect(getTiledObjectClass({ class: 'SpawnPoint', type: '' })).toBe('SpawnPoint');
    expect(getTiledObjectClass({ type: 'Door' })).toBe('');
    expect(getTiledObjectClass({ class: '', type: 'Door' })).toBe('');
  });

  it('requires a class and a registered constructor for map entity creation', () => {
    expect(() => EntityManager.createFromObject({}, { type: 'TiledSpriteExample' })).toThrow(/must define a class/);
    expect(() => EntityManager.createFromObject({}, { class: 'MissingEntity', id: 8 })).toThrow(/No registered entity class/);
  });

  it('uses a registered Tiled object factory when provided by the class', () => {
    class TiledObjectExample {
      static createFromTiledObject(scene, object, spriteAsset) {
        return { scene, object, spriteAsset };
      }
    }

    EntityManager.register(TiledObjectExample);
    const scene = {};
    const object = { class: 'TiledObjectExample', x: 12, y: 34 };
    const spriteAsset = { texture: 'station-tiles', frame: 4 };

    const instance = EntityManager.createFromObject(scene, object, spriteAsset);
    expect(instance).toMatchObject({
      scene,
      object,
      spriteAsset,
      entityType: 'TiledObjectExample',
    });
  });

  it('resolves atlas tile IDs and Tiled flip flags into local Phaser frames', () => {
    const tiledMap = {
      tilesets: [{
        firstgid: 1,
        tilecount: 8,
        name: 'station',
        image: 'station.png',
      }],
    };

    expect(resolveTiledTileAsset(tiledMap, { id: 4, gid: 0x80000003 })).toEqual({
      texture: 'station',
      frame: 2,
      gid: 3,
      localId: 2,
    });
  });

  it('resolves per-tile images and rejects invalid tile references', () => {
    const tiledMap = {
      tilesets: [{
        firstgid: 14,
        tilecount: 1,
        name: 'icons',
        tiles: [{ id: 0, image: 'door.png' }],
      }],
    };

    expect(resolveTiledTileAsset(tiledMap, { id: 9, gid: 14 })).toEqual({
      texture: 'door.png',
      frame: undefined,
      gid: 14,
      localId: 0,
    });
    expect(() => resolveTiledTileAsset(tiledMap, { id: 10, gid: 15 })).toThrow(/outside tileset/);
  });
});
