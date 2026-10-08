// all entity will register itself with this manaager

import type Enitity from "../entities/Entity"

export type EntityPropertyMap = Record<string, unknown>;

export type EntityConstructor<T extends Enitity> = new (
    ...args: any[]
) => T;

export type TiledObjectLike = {
    id?: number;
    name?: string;
    class?: string;
    type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    properties?: Array<{ name: string; value: unknown }>;
};

export type TiledSpriteAsset = {
    texture: string;
    frame?: string | number;
};

export class EntityManager{
    static list: Map<string, EntityConstructor<Enitity>> = new Map()

    static register(constructor:  new (...args: any[]) => any){
        const key = constructor.name;
        if (!EntityManager.list.has(key)) {
            EntityManager.list.set(key, constructor)
        }
    }

    static get(name: string){
        if (!name) {
            return null;
        }

        const normalizedName = name.trim();
        const candidates = [
            normalizedName,
            normalizedName.toLowerCase(),
            normalizedName.replace(/[-_\s]+/g, ''),
            normalizedName.replace(/[-_\s]+/g, '').toLowerCase(),
        ];

        for (const candidate of candidates) {
            const constructor = EntityManager.list.get(candidate);
            if (constructor) {
                return constructor;
            }
        }

        return null;
    }

    static propertiesFromObject(object: TiledObjectLike): EntityPropertyMap {
        return (object.properties ?? []).reduce<EntityPropertyMap>((result, property) => {
            result[property.name] = property.value;
            return result;
        }, {});
    }

    static createFromObject(scene: Phaser.Scene, object: TiledObjectLike, spriteAsset?: TiledSpriteAsset) {
        const typeName = object.class?.trim() ?? '';
        if (!typeName) {
            throw new Error(`Tiled object ${object.id ?? '<unknown>'} must define a class.`);
        }
        const constructor = this.get(typeName);

        if (!constructor) {
            throw new Error(`No registered entity class "${typeName}" for Tiled object ${object.id ?? '<unknown>'}.`);
        }

        const tiledConstructor = constructor as typeof constructor & {
            createFromTiledObject?: (
                scene: Phaser.Scene,
                object: TiledObjectLike,
                spriteAsset?: TiledSpriteAsset,
            ) => unknown;
        };
        const properties = this.propertiesFromObject(object);
        let instance: unknown;
        if (tiledConstructor.createFromTiledObject) {
            instance = tiledConstructor.createFromTiledObject(scene, object, spriteAsset);
        } else {
            const args: any[] = [scene, object.x ?? 0, object.y ?? 0];

            if (spriteAsset) {
                args.push(spriteAsset.texture, spriteAsset.frame);
            } else if (typeof object.width === 'number' || typeof object.height === 'number') {
                args.push(object.width ?? 0, object.height ?? 0);
            }

            if (Object.keys(properties).length > 0) {
                args.push(properties);
            }

            instance = Reflect.construct(constructor, args);
        }

        if (instance && typeof instance === 'object') {
            Object.assign(instance, {
                entityType: typeName,
                entityProperties: properties,
            });
        }

        return instance;
    }
}

export const EntityRegister = (constructor:  new (...args: any[]) => any) => {
        EntityManager.register(constructor)
}