/// <reference path="../custom.d.ts"/>


import TiledMap, { TiledLayer, TiledLayerImagelayer, TiledLayerObjectgroup } from 'tiled-types'
import Player from '../entities/Player';
import { Spawn } from '../entities/Spawn';
import { EntityManager } from './EntityManager';
import { Trigger } from './Interactables';
import { MappableTiledObject } from './TiledObjectData';
import { TiledObjectFactory } from './TiledObjectFactory';

type VisibleGameObject = Phaser.GameObjects.GameObject & {
    alpha?: number;
    setAlpha?: (alpha: number) => VisibleGameObject;
    setVisible?: (visible: boolean) => VisibleGameObject;
};

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
    private tiledData!: TiledMap;
    player!: Player;
    interactables!: Phaser.GameObjects.Group;
    cursors! : Phaser.Types.Input.Keyboard.CursorKeys;
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
             level.tilesets.forEach(({ name, image, tiles, tileheight: frameHeight, tilewidth: frameWidth, spacing }) =>{
            if(!image){
                tiles!.forEach((tile) =>{
                    this.load.image(tile.image!, tile.image);
                    this.tileImages.push(name + tile.id);
                    return;
                })

            } else {
            this.load.spritesheet(name, encodeURI(image), { frameWidth, frameHeight, spacing, startFrame: 0 })
            }
            this.tileSets.push(name);

        })

        this.loadLayerAssets(level.layers);
         this.load.tilemapTiledJSON(this.mapName,level)
         this.load.start()
        })
       
        if(!this.input.keyboard){
            throw new Error('keyboard plugin missing')
        }
        this.cursors = this.input.keyboard.createCursorKeys();
       
    }
    private loadLayerAssets(layers: TiledLayer[]): void {
        layers.forEach((layer) => {
            if (layer.type === 'imagelayer') {
                this.load.image(layer.name, encodeURI(layer.image));
            } else if (layer.type === 'group') {
                this.loadLayerAssets(layer.layers);
            }
        });
    }
    private addEntityFromMapObject(
        object: MappableTiledObject,
        offsetX: number,
        offsetY: number,
        layerVisible: boolean,
        layerOpacity: number,
    ): void {
        const positionedObject = {
            ...object,
            x: object.x + offsetX,
            y: object.y + offsetY,
        };
        const instance = TiledObjectFactory.create(this, this.tiledData, positionedObject);
        if (!instance) {
            return;
        }
        const visibleInstance = instance as VisibleGameObject;
        visibleInstance.setVisible?.(layerVisible && object.visible !== false);
        visibleInstance.setAlpha?.((visibleInstance.alpha ?? 1) * layerOpacity);
        if (instance instanceof Spawn && (!layerVisible || object.visible === false)) {
            instance.setDebugVisible(false);
        }
        this.add.existing(instance);

        if (instance instanceof Phaser.GameObjects.Zone) {
            this.zones.add(instance);
        } else {
            this.interactables.add(instance);
        }
        if (instance instanceof Spawn) {
            instance.spawnObjects((spawnPoint) => this.spawnFromPoint(spawnPoint));
        }
    }

    private spawnFromPoint(spawnPoint: Spawn): void {
        if (!spawnPoint.gameObject) {
            return;
        }
        const instance = EntityManager.createFromObject(this, {
            ...spawnPoint.tiledObject,
            class: spawnPoint.gameObjectClass,
            x: spawnPoint.x,
            y: spawnPoint.y,
        }, undefined, spawnPoint.gameObject);
        if (!(instance instanceof Phaser.GameObjects.GameObject)) {
            throw new Error(`Spawn object ${spawnPoint.objectId} did not create a Phaser GameObject.`);
        }

        if (!this.children.exists(instance)) {
            this.add.existing(instance);
        }
        if (instance instanceof Player) {
            this.player = instance;
        }
    }

    private createImageLayer(
        layer: TiledLayerImagelayer,
        offsetX: number,
        offsetY: number,
        visible: boolean,
        opacity: number,
    ): void {
        const extendedLayer = layer as TiledLayerImagelayer & { repeatx?: boolean; repeaty?: boolean; parallaxx?: number; parallaxy?: number };
        const repeats = extendedLayer.repeatx === true || extendedLayer.repeaty === true;
        const x = offsetX + (layer.offsetx ?? 0) + layer.x * this.map.tileWidth;
        const y = offsetY + (layer.offsety ?? 0) + layer.y * this.map.tileHeight;
        const image = repeats
            ? new Phaser.GameObjects.TileSprite(this, x, y, this.map.widthInPixels, this.map.heightInPixels, layer.name)
            : new Phaser.GameObjects.Image(this, x, y, layer.name);

        image.setOrigin(0, 0);
        image.setAlpha(opacity * (typeof layer.opacity === 'number' ? layer.opacity : 1));
        image.setVisible(visible && layer.visible !== false);
        image.setScrollFactor(extendedLayer.parallaxx ?? 1, extendedLayer.parallaxy ?? 1);
        this.add.existing(image);
    }

    private createMapLayers(
        layers: TiledLayer[],
        offsetX: number = 0,
        offsetY: number = 0,
        parentVisible: boolean = true,
        parentOpacity: number = 1,
    ): void {
        layers.forEach((layer) => {
            const visible = parentVisible && layer.visible !== false;
            const opacity = parentOpacity * (typeof layer.opacity === 'number' ? layer.opacity : 1);
            const xOffset = offsetX + (layer.offsetx ?? 0) + layer.x * this.map.tileWidth;
            const yOffset = offsetY + (layer.offsety ?? 0) + layer.y * this.map.tileHeight;

            if (layer.type === 'group') {
                this.createMapLayers(layer.layers, xOffset, yOffset, visible, opacity);
                return;
            }

            if (layer.type === 'imagelayer') {
                this.createImageLayer(layer, offsetX, offsetY, parentVisible, parentOpacity);
                return;
            }

            if (layer.type === 'objectgroup') {
                (layer as TiledLayerObjectgroup).objects.forEach((object) => {
                    this.addEntityFromMapObject(
                        object as MappableTiledObject,
                        xOffset,
                        yOffset,
                        visible,
                        opacity,
                    );
                });
                return;
            }

            const tileLayer = this.map.createLayer(
                layer.name,
                this.map.tilesets.map((tileset) => tileset.name),
            );
            if (!tileLayer) {
                throw new Error(`Unable to create Tiled tile layer "${layer.name}".`);
            }

            tileLayer.setPosition(
                xOffset,
                yOffset,
            );
            tileLayer.setAlpha(opacity);
            tileLayer.setVisible(visible);
            this.collisionLayer!.add(tileLayer.setCollisionByProperty({ isSolid: true }));
        });
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
        
        const level: TiledMap = this.cache.json.get(this.levelKey)
        this.tiledData = level;
        this.applySceneConfig(level);
        this.createMapLayers(level.layers as TiledLayer[]);
        this.map.setCollisionFromCollisionGroup(true, false, 'Collision')
        this.cameras.main.setBounds(0,0,this.game.scale.width * 3,this.game.scale.height);
        console.log(this.map);
    }

    update(time: number, delta: number): void {
    }
}