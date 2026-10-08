import { TiledMap, TiledProperty } from 'tiled-types';
import '../entities/interactables/Doors';
import '../entities/Spawn';
import { EntityManager, TiledSpriteAsset } from './EntityManager';
import {
    getTiledObjectClass,
    MappableTiledObject,
    resolveTiledTileAsset,
} from './TiledObjectData';

const HORIZONTAL_FLIP = 0x80000000;
const VERTICAL_FLIP = 0x40000000;
const DIAGONAL_FLIP = 0x20000000;

type VisualGameObject = Phaser.GameObjects.GameObject & {
    setAlpha?: (alpha: number) => VisualGameObject;
    setRotation?: (rotation: number) => VisualGameObject;
    setVisible?: (visible: boolean) => VisualGameObject;
};

type TileVisual = VisualGameObject & {
    setOrigin?: (x: number, y: number) => unknown;
    setDisplaySize?: (width: number, height: number) => unknown;
    setFlipX?: (value: boolean) => unknown;
    setFlipY?: (value: boolean) => unknown;
};

function propertiesFromObject(object: MappableTiledObject): TiledProperty[] {
    return object.properties ?? [];
}

function propertyValue(object: MappableTiledObject, name: string): unknown {
    return propertiesFromObject(object).find((property) => property.name === name)?.value;
}

function validateObjectGeometry(object: MappableTiledObject): void {
    const values = [object.x, object.y, object.width, object.height, object.rotation];
    if (values.some((value) => !Number.isFinite(value))) {
        throw new Error(`Tiled object ${object.id} has non-finite position, size, or rotation data.`);
    }
    if (object.width < 0 || object.height < 0) {
        throw new Error(`Tiled object ${object.id} has a negative width or height.`);
    }
    if (object.polygon && (object.polygon.length < 3 || object.polygon.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))) {
        throw new Error(`Tiled polygon object ${object.id} must contain at least three finite points.`);
    }
    if (object.polyline && (object.polyline.length < 2 || object.polyline.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))) {
        throw new Error(`Tiled polyline object ${object.id} must contain at least two finite points.`);
    }
}

function applyTiledMetadata(
    gameObject: Phaser.GameObjects.GameObject,
    object: MappableTiledObject,
): void {
    gameObject.setName(object.name || `${getTiledObjectClass(object)}-${object.id}`);
    const visual = gameObject as VisualGameObject;
    const diagonalFlip = typeof object.gid === 'number' && (((object.gid >>> 0) & DIAGONAL_FLIP) !== 0);
    visual.setRotation?.(Phaser.Math.DegToRad(object.rotation + (diagonalFlip ? 90 : 0)));
    gameObject.setData('tiledObject', object);
    gameObject.setData('tiledProperties', propertiesFromObject(object));

    const physicsType = propertyValue(object, 'engine.physics');
    if (physicsType === 'static' || physicsType === 'dynamic') {
        const isStatic = physicsType === 'static';
        const physicsObject = gameObject as Phaser.GameObjects.GameObject & {
            body?: {
                updateFromGameObject?: () => void;
                setAllowGravity?: (allowGravity: boolean) => void;
            };
        };
        if (!physicsObject.body) {
            gameObject.scene.physics.add.existing(gameObject, isStatic);
        }

        if (isStatic) {
            physicsObject.body?.updateFromGameObject?.();
        } else {
            physicsObject.body?.setAllowGravity?.(propertyValue(object, 'engine.physics.gravity') !== false);
        }
    }

    if (object.visible === false) {
        visual.setVisible?.(false);
    }

    const alpha = propertyValue(object, 'engine.visual.alpha');
    if (typeof alpha === 'number') {
        visual.setAlpha?.(Phaser.Math.Clamp(alpha, 0, 1));
    }
}

export class TiledObjectFactory {
    static create(
        scene: Phaser.Scene,
        tiledMap: TiledMap,
        object: MappableTiledObject,
    ): Phaser.GameObjects.GameObject | null {
        const className = getTiledObjectClass(object);
        if (!className) {
            console.error(`Skipping Tiled object ${object.id}: no class is defined.`);
            return null;
        }
        if (!EntityManager.get(className)) {
            console.error(`Skipping Tiled object ${object.id}: no registered class "${className}".`);
            return null;
        }

        validateObjectGeometry(object);
        const spriteAsset = typeof object.gid === 'number'
            ? this.resolveTileAsset(scene, tiledMap, object)
            : undefined;
        const instance = EntityManager.createFromObject(scene, object, spriteAsset);
        if (!(instance instanceof Phaser.GameObjects.GameObject)) {
            throw new Error(`Registered Tiled object class "${className}" did not create a Phaser GameObject.`);
        }

        if (spriteAsset) {
            this.configureTileObject(instance, object);
        }
        applyTiledMetadata(instance, object);
        return instance;
    }

    private static resolveTileAsset(
        scene: Phaser.Scene,
        tiledMap: TiledMap,
        object: MappableTiledObject,
    ): TiledSpriteAsset {
        const asset = resolveTiledTileAsset(tiledMap, object);
        const { texture, frame } = asset;
        if (!scene.textures.exists(texture)) {
            throw new Error(`Tiled object ${object.id} requires texture "${texture}", but it is not loaded.`);
        }
        if (frame !== undefined && !scene.textures.get(texture).has(String(frame))) {
            throw new Error(`Tiled object ${object.id} references missing frame ${frame} in texture "${texture}".`);
        }
        return { texture, frame };
    }

    private static configureTileObject(
        gameObject: Phaser.GameObjects.GameObject,
        object: MappableTiledObject,
    ): void {
        const visual = gameObject as TileVisual;
        const encodedGid = object.gid as number;
        const unsignedGid = encodedGid >>> 0;
        visual.setOrigin?.(0, 1);
        if (object.width > 0 && object.height > 0) {
            visual.setDisplaySize?.(object.width, object.height);
        }
        visual.setFlipX?.((unsignedGid & HORIZONTAL_FLIP) !== 0);
        visual.setFlipY?.((unsignedGid & VERTICAL_FLIP) !== 0);
        const physicsObject = gameObject as Phaser.GameObjects.GameObject & {
            body?: { updateFromGameObject?: () => void };
        };
        physicsObject.body?.updateFromGameObject?.();
    }
}
