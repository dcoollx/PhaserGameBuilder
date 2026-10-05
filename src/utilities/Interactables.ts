import { GameObjects } from 'phaser';
import Player, { Player_States } from '../entities/Player';
import Level from './Level';


export interface SpriteConfig {
    name: string,
    x?: number,
    y?: number,
    frame?: string | number,
    height?: number,
    width?: number,
}

export interface TriggerEventData {
    trigger: Trigger;
    source?: GameObjects.GameObject;
    name: string;
    id: number;
}

export interface Trigger extends Phaser.GameObjects.GameObject {
    name: string;
    id: number;
    enabled: boolean;
    setTriggerActive(active: boolean): void;
    onTrigger(source?: GameObjects.GameObject): void;
    setOnTrigger<T>(triggerFN: (source?: GameObjects.GameObject) => T): number;
}

export abstract class BaseTrigger extends Phaser.GameObjects.GameObject implements Trigger{
    protected control?: number;
    public id: number;
    public enabled: boolean;
    protected triggerEvents: Array<(source?: GameObjects.GameObject) => unknown>;

    constructor(scene: Level, id: number, config: { name: string }){
        super(scene, config.name);
        this.id = id;
        this.name = config.name
        this.enabled = true;
        this.triggerEvents = [];
    }

    setTriggerActive(active: boolean): void {
        this.enabled = active;
    }

    protected fire(source?: GameObjects.GameObject): void {
        if (!this.enabled) {
            return;
        }

        this.scene.events.emit('trigger', {
            trigger: this,
            source,
            name: this.name,
            id: this.id,
        } as TriggerEventData);

        this.triggerEvents.forEach((triggerFn) => triggerFn(source));
    }

    abstract onTrigger(source?: GameObjects.GameObject): void;

    setOnTrigger<T>(triggerFN: (source?: GameObjects.GameObject) => T): number {
        this.triggerEvents.push(triggerFN as (source?: GameObjects.GameObject) => unknown)
        return this.triggerEvents.length - 1
    }

    removeTriggerEvent(key: number): void {
       delete this.triggerEvents[key];
    }
}

export class TriggerZone extends BaseTrigger {
    body!: Phaser.Physics.Arcade.StaticBody;
    constructor(scene: Level, id: number, config: { name: string, height?: number, width?: number, x?: number, y?: number }, control?: number){
        super(scene, id, config)
        this.body = this.scene.physics.add.staticBody(config.x ?? 0, config.y ?? 0, config.width ?? 0, config.height ?? 0)
        this.scene.physics.add.overlap(this, scene.player, ()=> this.onTrigger(scene.player))
    }

    onTrigger(source?: GameObjects.GameObject): void {
        this.fire(source)
    }
}
