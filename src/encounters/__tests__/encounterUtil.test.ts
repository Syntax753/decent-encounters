import { stripOutcomeCodes, findOutcomeInText } from '../encounterUtil';

describe('encounterUtil', () => {
  describe('findOutcomeInText()', () => {
    it('should find no outcomes in empty string', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBeNull();
    });

    it('should find no outcomes in string with no codes', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "hi";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBeNull();
    });

    it('should find no outcomes in string with just a @', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "hi@";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBeNull();
    });

    it('should find no outcomes in string if code does not match an outcome', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "hi@3";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBeNull();
    });

    it('should find no outcomes in string if encounter does not have any outcomes defined', () => {
      const outcomes = {};
      const text = "hi@1";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBeNull();
    });

    it('finds outcome by itself', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "@1";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBe('Outcome One');
    });

    it('finds outcome at beginning of text', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "@1Text";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBe('Outcome One');
    });

    it('finds outcome at end of text', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "Text@1";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBe('Outcome One');
    });

    it('finds outcome in middle of text', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "Text@1Text";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBe('Outcome One');
    });

    it('finds outcome if code has two @', () => {
      const outcomes = {'1':'Outcome One', '2':'Outcome Two'};
      const text = "Text@@1Text";
      const outcome = findOutcomeInText(text, outcomes);
      expect(outcome).toBe('Outcome One');
    });
    
  });

  describe('stripOutcomeCodes()', () => {
    it('returns empty string unchanged', () => {
      const input = "";
      const output = stripOutcomeCodes(input);
      expect(output).toEqual(input);
    });

    it('returns text with no codes unchanged', () => {
      const input = "just an ordinary bit of text";
      const output = stripOutcomeCodes(input);
      expect(output).toEqual(input);
    });

    it('should strip single outcome code', () => {
      const input = "You have succeeded! @1";
      const output = stripOutcomeCodes(input);
      expect(output).toBe("You have succeeded! ");
    });

    it('strips outcome code by itself', () => {
      const input = "@1";
      const output = stripOutcomeCodes(input);
      expect(output).toBe("");
    });

    it('strips two outcome codes by themselves', () => {
      const input = "@1@2";
      const output = stripOutcomeCodes(input);
      expect(output).toBe("");
    });

    it('strips outcome code at beginning of text', () => {
      const input = "@1text";
      const output = stripOutcomeCodes(input);
      expect(output).toBe("text");
    });

    it('strips outcome code at end of text', () => {
      const input = "text@1";
      const output = stripOutcomeCodes(input);
      expect(output).toBe("text");
    });

    it('strips outcome code in middle of text', () => {
      const input = "te@1xt";
      const output = stripOutcomeCodes(input);
      expect(output).toBe("text");
    });

    it('strips multiple outcome codes from text', () => {
      const input = "@2te@1xt@3";
      const output = stripOutcomeCodes(input);
      expect(output).toBe("text");
    });
  });
});