import { TiledMap, TiledObject } from 'tiled-types';

export type MappableTiledObject = TiledObject & {
    class?: string;
};

export type TiledTileAssetData = {
    texture: string;
    frame?: number;
    gid: number;
    localId: number;
};

const GID_MASK = 0x0fffffff;

export function getTiledObjectClass(object: MappableTiledObject): string {
    return object.type?.trim() ?? '';
}

export function resolveTiledTileAsset(
    tiledMap: TiledMap,
    object: MappableTiledObject,
): TiledTileAssetData {
    if (typeof object.gid !== 'number') {
        throw new Error(`Tiled object ${object.id} does not reference a tile gid.`);
    }

    const gid = (object.gid >>> 0) & GID_MASK;
    const tileset = tiledMap.tilesets
        .filter((candidate) => candidate.firstgid <= gid)
        .sort((left, right) => right.firstgid - left.firstgid)[0];

    if (!tileset) {
        throw new Error(`Tiled object ${object.id} references gid ${gid}, but no tileset contains it.`);
    }

    const localId = gid - tileset.firstgid;
    if (localId >= tileset.tilecount) {
        throw new Error(`Tiled object ${object.id} references gid ${gid}, outside tileset "${tileset.name}".`);
    }

    const tile = tileset.tiles?.find((candidate) => candidate.id === localId);
    const texture = tile?.image ?? tileset.image ?? '';
    if (!texture) {
        throw new Error(`Tiled object ${object.id} references tile ${localId} in tileset "${tileset.name}" without an image.`);
    }

    return {
        texture: tile?.image ?? tileset.name,
        frame: tile?.image ? undefined : localId,
        gid,
        localId,
    };
}
