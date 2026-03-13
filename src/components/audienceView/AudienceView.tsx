import { useEffect, useRef } from 'react';

import CharacterSpriteset from '@/components/audienceView/types/CharacterSpriteset';
import Canvas from '../canvas/Canvas';
import styles from './AudienceView.module.css';
import AudienceMember from '@/encounters/v0/types/AudienceMember';
import CrowdDrawState from './types/CrowdDrawState';
import { createCrowdDrawState, drawCrowd } from './crowdUtil';

const CROWD_IDLE_UPDATE_INTERVAL = 500; // msecs

type Props = {
  characterSpriteset:CharacterSpriteset|null,
  audienceMembers:AudienceMember[]
}

let lastCrowdUpdate = 0;

function _getRandomInt(min:number, max:number):number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function _updateCrowdForIdleMovement(crowdDrawState:CrowdDrawState) {
  for(let i = 0; i < crowdDrawState.characterDrawStates.length; ++i) {
    const drawState = crowdDrawState.characterDrawStates[i];
    drawState.bodyFrameNo = _getRandomInt(0, drawState.sprite.bodyRects.length);
    if (drawState.bodyFrameNo === 0) drawState.happiness = Math.random();
  }
}

function _onDraw(crowdDrawState:CrowdDrawState, context:CanvasRenderingContext2D) {
  const now = performance.now();
  if (!lastCrowdUpdate || (now - lastCrowdUpdate) > CROWD_IDLE_UPDATE_INTERVAL) {
    _updateCrowdForIdleMovement(crowdDrawState);
    lastCrowdUpdate = now;
  }
  context.fillStyle = 'red';
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  drawCrowd(crowdDrawState, context);
}

function _onDrawLoading(context:CanvasRenderingContext2D) {
  context.fillStyle = 'red';
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
}

function AudienceView({characterSpriteset, audienceMembers}:Props) {
  const crowdDrawStateRef = useRef<CrowdDrawState|null>(null);
  const containerRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    if (!characterSpriteset || audienceMembers.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const canvasWidth = Math.floor(rect.width);
    const canvasHeight = Math.floor(rect.height);
    if (canvasWidth === 0 || canvasHeight === 0) return;
    crowdDrawStateRef.current = createCrowdDrawState(characterSpriteset, audienceMembers, canvasWidth, canvasHeight);
  }, [characterSpriteset, audienceMembers]);

  return (<div ref={containerRef} className={styles.container}>
    <Canvas onDraw={(context) => {
      const crowdDrawState = crowdDrawStateRef.current;
      if (!crowdDrawState) {
        _onDrawLoading(context);
        return;
      }
      _onDraw(crowdDrawState, context)
    }} isAnimated/>
  </div>);
}

export default AudienceView;