import { TiledObject, TiledProperty } from 'tiled-types';
import { EntityManager, EntityRegister, TiledObjectLike } from '../utilities/EntityManager';

export type SpawnObject = TiledObject & {
    class?: string;
};

@EntityRegister
export class Spawn extends Phaser.GameObjects.Zone {
    readonly objectId: number;
    readonly polygon: Array<{ x: number; y: number }>;
    readonly gameObjectClass: string;
    readonly gameObject: (new (...args: any[]) => Phaser.GameObjects.GameObject) | null;
    readonly count: number;
    readonly timeout?: number;
    readonly tiledObject: SpawnObject;
    private debugShape: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene, object: SpawnObject) {
        super(scene, object.x, object.y, object.width, object.height);
        this.objectId = object.id;
        this.polygon = object.polygon ?? [];
        this.tiledObject = object;
        const properties = object.properties ?? [];
        const gameObjectClass = properties.find(
            (property) => property.name === 'engine.spawn.class',
        )?.value;
        this.gameObjectClass = typeof gameObjectClass === 'string' ? gameObjectClass.trim() : '';
        this.gameObject = EntityManager.get(this.gameObjectClass) as (
            new (...args: any[]) => Phaser.GameObjects.GameObject
        ) | null;
        const count = properties.find((property) => property.name === 'engine.spawn.count')?.value;
        if (count === undefined) {
            this.count = 1;
        } else if (typeof count === 'number' && Number.isInteger(count) && count >= 0) {
            this.count = count;
        } else {
            console.error(`Spawn object ${object.id} has an invalid engine.spawn.count value.`);
            this.count = 0;
        }
        const timeout = properties.find((property) => property.name === 'engine.spawn.timeout')?.value;
        if (timeout === undefined) {
            this.timeout = undefined;
        } else if (typeof timeout === 'number' && Number.isFinite(timeout) && timeout >= 0) {
            this.timeout = timeout;
        } else {
            console.error(`Spawn object ${object.id} has an invalid engine.spawn.timeout value.`);
            this.count = 0;
            this.timeout = undefined;
        }
        this.setOrigin(0, 0);
        this.setName(object.name || `spawn-${object.id}`);
        this.setRotation(Phaser.Math.DegToRad(object.rotation));
        this.setData('tiledObject', object);
        this.setData('tiledProperties', object.properties ?? []);
    }

    static createFromTiledObject(scene: Phaser.Scene, object: TiledObjectLike): Spawn {
        const spawnObject = object as SpawnObject;
        const spawn = new Spawn(scene, spawnObject);
        const debugVisible = spawnObject.properties?.find(
            (property: TiledProperty) => property.name === 'engine.debugVisible',
        )?.value === true;
        spawn.setDebugVisible(debugVisible);
        return spawn;
    }

    spawnObjects(spawn: (spawnPoint: Spawn) => void): void {
        if (!this.gameObject) {
            console.error(
                `Spawn object ${this.objectId} cannot spawn "${this.gameObjectClass || '<missing class>'}": class is not registered.`,
            );
            return;
        }

        if (this.count === 0) {
            return;
        }

        const createObject = (): void => spawn(this);
        createObject();
        if (this.count === 1 || this.timeout === undefined || this.timeout === 0) {
            for (let index = 1; index < this.count; index += 1) {
                createObject();
            }
            return;
        }

        this.scene.time.addEvent({
            delay: this.timeout,
            repeat: this.count - 2,
            callback: createObject,
        });
    }

    setDebugVisible(visible: boolean): void {
        if (!visible) {
            this.debugShape?.destroy();
            this.debugShape = null;
            return;
        }

        if (this.debugShape) {
            return;
        }

        const graphics = new Phaser.GameObjects.Graphics(this.scene);
        graphics.lineStyle(2, 0x00ff00, 1);
        graphics.setPosition(this.x, this.y);
        graphics.setRotation(this.rotation);

        if (this.polygon.length > 0) {
            graphics.beginPath();
            graphics.moveTo(this.polygon[0].x, this.polygon[0].y);
            this.polygon.slice(1).forEach(({ x, y }) => graphics.lineTo(x, y));
            graphics.closePath();
            graphics.strokePath();
        } else {
            graphics.strokeRect(0, 0, this.width, this.height);
        }

        this.scene.add.existing(graphics);
        this.debugShape = graphics;
    }
}
