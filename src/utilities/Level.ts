/// <reference path="../custom.d.ts"/>


import TiledMap from 'tiled-types'
import Player from '../entities/Player';
import { EntityManager, EntityConstructor } from './EntityManager';

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
    constructor(level: string, scene_name : string,){
        super({key:scene_name});
        this.mapName = scene_name + '_map';
        this.level = level;
        this.levelKey = scene_name + '_level';
        this.tileSets = [];
        this.tileImages = []
        this.collisionLayer = null;
    }
    static registerObjects(constructors:  Array<new (...args: any[]) =>any>){
        constructors.forEach((con) => EntityManager.register(con))
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