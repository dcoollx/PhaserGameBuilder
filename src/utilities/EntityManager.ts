// all entity will register itself with this manaager

import Enitity from "../entities/Entity"

export type EntityPropertyMap = Record<string, unknown>;

export type EntityConstructor<T extends Enitity> = new (
    ...args: any[]
) => T;

export type TiledObjectLike = {
    id?: number;
    name?: string;
    type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    properties?: Array<{ name: string; value: unknown }>;
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

    static createFromObject(scene: Phaser.Scene, object: TiledObjectLike) {
        const typeName = object.type ?? object.name ?? 'Entity';
        const constructor = this.get(typeName);

        if (!constructor) {
            return null;
        }

        const properties = this.propertiesFromObject(object);
        const args: any[] = [scene, object.x ?? 0, object.y ?? 0];

        if (typeof object.width === 'number' || typeof object.height === 'number') {
            args.push(object.width ?? 0, object.height ?? 0);
        }

        if (Object.keys(properties).length > 0) {
            args.push(properties);
        }

        const instance = Reflect.construct(constructor, args);

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