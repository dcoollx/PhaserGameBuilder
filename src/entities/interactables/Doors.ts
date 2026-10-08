import { EntityRegister } from '../../utilities/EntityManager';

function toBoolean(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return defaultValue;
}

@EntityRegister
export class Door extends Phaser.Physics.Arcade.Sprite {
    readonly gameObject: Phaser.GameObjects.GameObject = this;
    public locked: boolean;
    public open: boolean;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string | Phaser.Textures.Texture,
        frame?: string | number,
        properties: Record<string, unknown> = {},
    ) {
        super(scene, x, y, texture, frame);
        this.locked = toBoolean(properties['engine.door.locked'], true);
        this.open = toBoolean(properties['engine.door.open'], false);
        scene.physics.add.existing(this, true);
        this.setData('door', this);
        this.setOpen(this.open);
        this.setLocked(this.locked);
    }

    setLocked(locked: boolean): void {
        this.locked = locked;
        this.setAlpha(locked ? 0.65 : 1);
    }

    setOpen(open: boolean): void {
        this.open = open;
        this.setVisible(!open);
        if (this.body) {
            this.body.enable = !open;
        }
    }

    toggleOpen(): boolean {
        if (this.locked) {
            return false;
        }

        this.setOpen(!this.open);
        return this.open;
    }
}
