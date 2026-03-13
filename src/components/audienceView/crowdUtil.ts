import AudienceMember from "@/encounters/v0/types/AudienceMember";
import CharacterSpriteset from "./types/CharacterSpriteset";
import CrowdDrawState from "./types/CrowdDrawState";
import { createCharacterDrawState, drawCharacter } from "./characterSpriteUtil";
import CharacterDrawState from "./types/CharacterDrawState";
import { assert } from "decent-portal";

type SeatingRequest = CharacterDrawState|null;

const UNSPECIFIED_RECT = {x:0, y:0, w:0, h:0};

function _shuffleSeatingRequests(seatingRequests:SeatingRequest[]) {
  for (let i = seatingRequests.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap:SeatingRequest = seatingRequests[i];
    seatingRequests[i] = seatingRequests[j];
    seatingRequests[j] = swap;
  }
  return seatingRequests;
}

// Return a randomized array of seating requests and empty spaces. All requested audience members will be included in specified counts,
// with draw state initialized, but not yet having dest rects specified.
function _createSeatingRequests(characterSpriteset:CharacterSpriteset, audienceMembers:AudienceMember[], emptyPercent:number = .1):SeatingRequest[] {
  const seatingRequests:SeatingRequest[] = [];
  audienceMembers.forEach(audienceMember => {
    const bodyFrameCount = characterSpriteset.sprites[audienceMember.characterId].bodyRects.length;
    for(let i = 0; i < audienceMember.count; ++i) {
      const bodyFrameI = Math.floor(Math.random() * bodyFrameCount); 
      const characterDrawState = createCharacterDrawState(characterSpriteset, audienceMember.characterId, UNSPECIFIED_RECT, bodyFrameI, audienceMember.happiness);
      seatingRequests.push(characterDrawState);
    }
  });
  const emptySpaceCount = Math.round(seatingRequests.length * emptyPercent);
  for (let i = 0; i < emptySpaceCount; ++i) seatingRequests.push(null);
  _shuffleSeatingRequests(seatingRequests);
  return seatingRequests;
}

// Return a column count and row count sufficient seat the requested number of people and following the aspect ratio of the draw area.
function _calcColumnRowCount(seatingRequestCount:number, drawAreaWidth:number, drawAreaHeight:number):{columnCount:number, rowCount:number} {
  assert(seatingRequestCount > 0);
  assert(drawAreaWidth > 0);
  assert(drawAreaHeight > 0);
  const aspectRatio = drawAreaWidth / drawAreaHeight;
  const rowCount = Math.round(Math.sqrt(seatingRequestCount / aspectRatio));
  const columnCount = Math.ceil(seatingRequestCount / rowCount);
  return {columnCount, rowCount};
}

function _assignSeats(seatingRequests:SeatingRequest[], columnCount:number, rowCount:number, drawAreaWidth:number, drawAreaHeight:number):CharacterDrawState[] {
  const drawStates:CharacterDrawState[] = [];
  const seatWidth = drawAreaWidth / columnCount;
  const seatHeight = drawAreaHeight / rowCount; 
  const w = seatWidth, h = seatHeight; // TODO adjust these for aspect ratio of sprites. Also you want some overlap and staggering.
  let y = 0;
  for(let rowI = 0; rowI < rowCount; ++rowI) {
    let x = 0;
    for(let colI = 0; colI < columnCount; ++colI) {
      const seatingRequest = seatingRequests.pop();
      if (seatingRequest) {
        seatingRequest.destRect = {x, y, w, h};
        drawStates.push(seatingRequest);
      }
      x += seatWidth;
    }
    y += seatHeight;
  }
  return drawStates;
}

export function createCrowdDrawState(characterSpriteset:CharacterSpriteset, audienceMembers:AudienceMember[], drawAreaWidth:number, drawAreaHeight:number):CrowdDrawState {
  Object.freeze(UNSPECIFIED_RECT);

  const seatingRequests = _createSeatingRequests(characterSpriteset, audienceMembers);
  if (!seatingRequests.length) return { characterDrawStates:[] };

  const {columnCount, rowCount} = _calcColumnRowCount(seatingRequests.length, drawAreaWidth, drawAreaHeight);
  const characterDrawStates = _assignSeats(seatingRequests, columnCount, rowCount, drawAreaWidth, drawAreaHeight);
  
  return { characterDrawStates };
}

export function drawCrowd(crowdDrawState:CrowdDrawState, context:CanvasRenderingContext2D) {
  crowdDrawState.characterDrawStates.forEach(characterDrawState => drawCharacter(characterDrawState, context));
}

// NEXT get homescreen to pass audiencemembers and test this code.