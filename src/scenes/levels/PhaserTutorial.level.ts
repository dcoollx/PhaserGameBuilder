import Level from "../../utilities/Level";
import { Star } from "../../entities/demo/Star";

export class TutorialLevel extends Level{
    score: number;
    hud: Phaser.GameObjects.Text | undefined;
    constructor(){
        super('demo.tmj', 'demolevel')
        this.score = 0;
        this.hud = undefined;
    }

    preload(baseUrl?: string): void {
        super.preload('assets/demolevel');
        this.load.spritesheet('player-idle', 'dude.png', { frameWidth: 32, frameHeight: 48, startFrame:6, endFrame: 6 });
        this.load.spritesheet('player-jump', 'dude.png', { frameWidth: 32, frameHeight: 48, startFrame:6, endFrame: 6 });
        this.load.spritesheet('player-run', 'dude.png', { frameWidth: 32, frameHeight: 48, startFrame:1, endFrame: 5 });
        this.load.audio('collect_star', 'collect_star.wav')
    }

    create(): void {
        super.create();
        const collect_star = this.sound.add('collect_star');
        this.hud = this.add.text(16,16, 'score: 0', {fontSize: '32px', color: '#000'});
        this.physics.world.setBounds(0,0,this.map.widthInPixels, this.map.heightInPixels);
        this.physics.world.gravity.y = 700;
        this.physics.add.collider(this.player, this.collisionLayer!);
        this.physics.add.overlap(this.player, this.interactables, (player, object)=>{
            collect_star.play();
            (object as Star).onCollide();
        });
        Star.update();
    }

    update(time: number, delta: number): void {
        super.update(time, delta);
        this.player.update()
        
    }
}