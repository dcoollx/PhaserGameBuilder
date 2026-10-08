import { TiledObject, TiledProperty } from 'tiled-types';
import { EntityRegister, TiledObjectLike } from '../utilities/EntityManager';

export type SpawnObject = TiledObject & {
    class?: string;
};

@EntityRegister
export class Spawn extends Phaser.GameObjects.Zone {
    readonly objectId: number;
    readonly polygon: Array<{ x: number; y: number }>;
    private debugShape: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene, object: SpawnObject) {
        super(scene, object.x, object.y, object.width, object.height);
        this.objectId = object.id;
        this.polygon = object.polygon ?? [];
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
