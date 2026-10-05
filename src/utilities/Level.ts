/// <reference path="../custom.d.ts"/>


import TiledMap from 'tiled-types'
import Player from '../entities/Player';
import { EntityManager, EntityConstructor } from './EntityManager';
import { Trigger } from './Interactables';

export interface SceneConfig {
    gravity?: { x?: number; y?: number };
    cameraZoom?: number;
    backgroundColor?: string;
    ui?: string;
    uiPosition?: { x?: number; y?: number };
    uiData?: unknown;
    sceneClass?: string;
    transition?: {
        nextScene?: string;
        duration?: number;
        type?: 'fade' | 'slide';
    };
}

export default abstract class Level extends Phaser.Scene {
    private mapName:string;
    private level: string;
    collisionLayer: Phaser.GameObjects.Group | null;
    map!:Phaser.Tilemaps.Tilemap;
    player!: Player;
    interactables!: Phaser.GameObjects.Group;
    cursors! : Phaser.Types.Input.Keyboard.CursorKeys;
    public background!: Phaser.GameObjects.TileSprite; 
    public tileSets: Array<string>
    levelKey: string;
    zones!: Phaser.GameObjects.Group;
    tileImages: string[];
    triggers!: Map<string, Trigger>;
    sceneConfig: SceneConfig = {};
    constructor(level: string, scene_name : string){
        super({key:scene_name});
        this.mapName = scene_name + '_map';
        this.level = level;
        this.levelKey = scene_name + '_level';
        this.tileSets = [];
        this.tileImages = []
        this.collisionLayer = null;
        this.triggers = new Map();
    }
    static registerObjects(constructors:  Array<new (...args: any[]) =>any>){
        constructors.forEach((con) => EntityManager.register(con))
    }
    registerTrigger(trigger: Trigger): Trigger {
        this.triggers.set(trigger.name || `trigger-${trigger.id}`, trigger);
        return trigger;
    }
    private parseObjectValue(value: unknown): unknown {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (_error) {
                return value;
            }
        }

        return value;
    }
    private parseSceneConfig(level: TiledMap): SceneConfig {
        const rootProperties = ((level as any).properties ?? []) as Array<{ name: string; value: unknown }>;
        const propertyMap: Record<string, unknown> = {};

        rootProperties.forEach(({ name, value }) => {
            propertyMap[name] = value;
        });

        let gravityValue: unknown = propertyMap.gravity;
        if (gravityValue === undefined && (propertyMap.gravityX !== undefined || propertyMap.gravityY !== undefined)) {
            gravityValue = {
                x: propertyMap.gravityX,
                y: propertyMap.gravityY,
            };
        }

        let gravity: unknown = gravityValue;
        if (typeof gravityValue === 'string') {
            gravity = this.parseObjectValue(gravityValue);
        }

        const sceneConfig: SceneConfig = {};

        if (gravity && typeof gravity === 'object') {
            const gravityObject = gravity as { x?: number; y?: number };
            sceneConfig.gravity = {
                x: typeof gravityObject.x === 'number' ? gravityObject.x : undefined,
                y: typeof gravityObject.y === 'number' ? gravityObject.y : undefined,
            };
        }

        if (propertyMap.cameraZoom !== undefined && typeof propertyMap.cameraZoom === 'number') {
            sceneConfig.cameraZoom = propertyMap.cameraZoom as number;
        }

        if (propertyMap.backgroundColor !== undefined) {
            sceneConfig.backgroundColor = String(propertyMap.backgroundColor);
        }

        if (typeof propertyMap.ui === 'string' && propertyMap.ui.length > 0) {
            sceneConfig.ui = propertyMap.ui as string;
        }

        const uiPositionValue = this.parseObjectValue(propertyMap.uiPosition);
        if (uiPositionValue && typeof uiPositionValue === 'object') {
            const { x, y } = uiPositionValue as { x?: number; y?: number };
            sceneConfig.uiPosition = {
                x: typeof x === 'number' ? x : undefined,
                y: typeof y === 'number' ? y : undefined,
            };
        }

        const uiDataValue = this.parseObjectValue(propertyMap.uiData);
        if (uiDataValue !== undefined) {
            sceneConfig.uiData = uiDataValue;
        }

        if (typeof propertyMap.class === 'string' && propertyMap.class.length > 0) {
            sceneConfig.sceneClass = propertyMap.class as string;
        }

        const transitionValue = this.parseObjectValue(propertyMap.transition);
        if (transitionValue && typeof transitionValue === 'object') {
            sceneConfig.transition = transitionValue as SceneConfig['transition'];
        }

        return sceneConfig;
    }
    private instantiateUiFromConfig(): void {
        if (typeof this.sceneConfig.ui !== 'string' || this.sceneConfig.ui.length === 0) {
            return;
        }

        const uiConstructor = EntityManager.get(this.sceneConfig.ui);
        if (!uiConstructor) {
            console.debug(`didnt find ${this.sceneConfig.ui} in Entity`);
            console.debug(EntityManager.list);
            return;
        }

        const uiPosition = this.sceneConfig.uiPosition ?? { x: 0, y: 0 };
        const uiData = this.sceneConfig.uiData;
        const instance = Reflect.construct(uiConstructor, [this, uiPosition.x ?? 0, uiPosition.y ?? 0, uiData]);

        if (instance instanceof Phaser.GameObjects.GameObject) {
            this.add.existing(instance);
        }
    }
    private applySceneConfig(level: TiledMap): void {
        this.sceneConfig = this.parseSceneConfig(level);

        if (typeof this.sceneConfig.gravity?.x === 'number' && typeof this.sceneConfig.gravity?.y === 'number') {
            this.physics.world.gravity.set(this.sceneConfig.gravity.x, this.sceneConfig.gravity.y);
        }

        if (typeof this.sceneConfig.cameraZoom === 'number') {
            this.cameras.main.setZoom(this.sceneConfig.cameraZoom);
        }

        if (typeof this.sceneConfig.backgroundColor === 'string') {
            this.cameras.main.setBackgroundColor(this.sceneConfig.backgroundColor);
        }

        this.instantiateUiFromConfig();
    }
    preload(baseUrl?: string){
        this.load.setBaseURL(baseUrl)
        this.load.json(this.levelKey, this.level)
        this.load.on(`filecomplete-json-${this.levelKey}`, (_: string, _2: unknown, level: TiledMap)=>{
             level.tilesets.forEach(({ name, image, tiles, tileheight: frameHeight, tilewidth: frameWidth, spacing, firstgid: startFrame }) =>{
            if(!image){
                tiles!.forEach((tile) =>{
                    this.load.image(tile.image!, tile.image);
                    this.tileImages.push(name + tile.id);
                    return;
                })

            } else {
            this.load.spritesheet(name, encodeURI(image), { frameWidth, frameHeight, spacing, startFrame})
            }
            this.tileSets.push(name);

        })

        level.layers.forEach(({name, type, ...rest })=>{
            if(type === 'imagelayer'){
                this.load.image(name, encodeURI((rest as any).image));
            }
            if(type === 'objectgroup'){
                // we may need to load any object images later, for now they are in same as map
                // this.load.image(name, encodeURI((rest as any).image))
            }
        })
         this.load.tilemapTiledJSON(this.mapName,level)
         this.load.start()
        })
       
        if(!this.input.keyboard){
            throw new Error('keyboard plugin missing')
        }
        this.cursors = this.input.keyboard.createCursorKeys();
       
    }
    private addEntityFromMapObject(object: any): void {
        const instance = EntityManager.createFromObject(this, object as any);

        if (!instance) {
            const objectName = object?.type ?? object?.name ?? 'unknown';
            console.debug(`didnt find ${objectName} in Entity`);
            console.debug(EntityManager.list);
            return;
        }

        if (instance instanceof Phaser.GameObjects.Zone) {
            this.zones.add(instance);
            return;
        }

        if (instance instanceof Phaser.GameObjects.GameObject) {
            this.interactables.add(instance);
        }
    }

    create(){
        this.interactables = this.add.group()
        this.zones = this.add.group()
        this.collisionLayer = this.add.group();
        this.map = this.make.tilemap({ key: this.mapName });
        this.map.tilesets.forEach((ts, i)=>{
            const key = ts.name
            this.map.addTilesetImage(ts.name)
        })
        
        this.map.images.forEach(( {x, y, name, repeatx, parallaxx }) => {
            const image = this.add.tileSprite(x, y, 0,0, name)
            image.setScrollFactor(0,  0 )
            image.setOrigin(0);
            this.background = image;
        })
       
        const level: TiledMap = this.cache.json.get(this.levelKey)
        this.applySceneConfig(level);
        level.layers.forEach((layer)=>{
            const {name, type } = layer
            if(type === 'objectgroup'){
                layer.objects.forEach((object) => this.addEntityFromMapObject(object))
            }
            if(type === 'tilelayer'){
                this.collisionLayer!.add(this.map.createLayer(name, this.map.tilesets.map(l=>l.name))!.setCollisionByProperty({ isSolid: true}))
            }
        })
        this.map.setCollisionFromCollisionGroup(true, false, 'Collision')
        this.cameras.main.setBounds(0,0,this.game.scale.width * 3,this.game.scale.height);
        console.log(this.map);
    }

    update(time: number, delta: number): void {
        if(this.background){
            this.background.tilePositionX = this.cameras.main.scrollX * 0.3
        }
        
    }
}