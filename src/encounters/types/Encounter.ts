type Encounter = {
  title:string,
  preamble:string,
  systemMessage:string,
  outcomes:Record<string, string>
};

export default Encounter;