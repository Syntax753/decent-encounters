import CharacterSprite from "./CharacterSprite";
import Rect from "./Rect";

type CharacterDrawState = {
  spriteMap:ImageBitmap,
  sprite:CharacterSprite,
  happiness:number,
  bodyFrameNo:number,
  destRect:Rect
}

export default CharacterDrawState;