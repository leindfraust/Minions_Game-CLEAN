/**
 * Security robots.
 *
 * Behaviour is a small state machine with hysteresis: a robot starts to chase
 * inside `detection` and only gives up past `loseInterest`, which is larger.
 * Without that gap a player standing at exactly the detection radius would
 * make the robot flicker between states every frame.
 */

import Phaser from "phaser";
import { GAME, PALETTE } from "@/game/config/constants";

/** Robot states. */
export const ROBOT_STATE = {
  PATROL: "patrol",
  CHASE: "chase",
};

/**
 * Build one robot on a two-point patrol route.
 * @param {Phaser.Scene} scene
 * @param {[[number, number], [number, number]]} route
 */
export function createRobot(scene, route) {
  const [[x, y]] = route;

  const chassis = scene.add
    .rectangle(0, 0, 29, 29, PALETTE.robotBody)
    .setStrokeStyle(2, PALETTE.robotStroke);
  /** Scanner bar: colour tells the player which state the robot is in. */
  const scanner = scene.add.rectangle(0, -3, 21, 8, PALETTE.robotPatrol);
  const wheelLeft = scene.add.circle(-11, 17, 5, PALETTE.robotWheel);
  const wheelRight = scene.add.circle(11, 17, 5, PALETTE.robotWheel);

  const robot = scene.add.container(x, y, [
    chassis,
    scanner,
    wheelLeft,
    wheelRight,
  ]);
  scene.physics.add.existing(robot);
  robot.body.setCircle(17, -17, -17).setCollideWorldBounds(true);

  Object.assign(robot, {
    route,
    /** Index of the waypoint currently being walked toward. */
    point: 1,
    state: ROBOT_STATE.PATROL,
    /** Mission-clock deadlines, all in milliseconds. */
    stunUntil: 0,
    attackUntil: 0,
    pushUntil: 0,
    scanner,
  });

  return robot;
}

/**
 * Advance one robot for this frame.
 *
 * @param {Phaser.GameObjects.Container} robot
 * @param {{x: number, y: number}} target  Player, or a decoy when one is active.
 * @param {number} now  Mission time in milliseconds.
 */
export function updateRobot(robot, target, now) {
  // Stunned: held in place and visibly dimmed. A knockback push is allowed to
  // finish first so Moss's slam actually throws the robot.
  if (now < robot.stunUntil) {
    if (now > robot.pushUntil) robot.body.stop();
    robot.alpha = 0.45;
    robot.scanner.fillColor = PALETTE.robotStroke;
    return;
  }

  robot.alpha = 1;

  // Brief recovery pause after landing a hit, so contact damage cannot chain.
  if (now < robot.attackUntil) {
    robot.body.stop();
    return;
  }

  const distance = Phaser.Math.Distance.Between(
    robot.x,
    robot.y,
    target.x,
    target.y,
  );

  // Hysteresis: acquire close, release far.
  if (distance < GAME.detection) robot.state = ROBOT_STATE.CHASE;
  else if (distance > GAME.loseInterest) robot.state = ROBOT_STATE.PATROL;

  const chasing = robot.state === ROBOT_STATE.CHASE;

  let destX;
  let destY;
  if (chasing) {
    destX = target.x;
    destY = target.y;
  } else {
    [destX, destY] = robot.route[robot.point];
    // Waypoint reached: turn around.
    if (Phaser.Math.Distance.Between(robot.x, robot.y, destX, destY) < 15) {
      robot.point = 1 - robot.point;
    }
  }

  const angle = Phaser.Math.Angle.Between(robot.x, robot.y, destX, destY);
  const speed = GAME.robotSpeed * (chasing ? 1 : GAME.patrolSpeedFactor);
  robot.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

  robot.scanner.fillColor = chasing ? PALETTE.robotChase : PALETTE.robotPatrol;
}

/**
 * Stun a robot and optionally knock it back.
 * @param {Phaser.GameObjects.Container} robot
 * @param {number} now
 * @param {{stunMs: number, knockback?: number, fromX?: number, fromY?: number}} opts
 */
export function stunRobot(robot, now, opts) {
  robot.stunUntil = now + opts.stunMs;
  robot.body.stop();

  if (opts.knockback) {
    const angle = Phaser.Math.Angle.Between(
      opts.fromX,
      opts.fromY,
      robot.x,
      robot.y,
    );
    robot.body.setVelocity(
      Math.cos(angle) * opts.knockback,
      Math.sin(angle) * opts.knockback,
    );
    robot.pushUntil = now + 200;
  }
}
