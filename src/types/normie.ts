export type NormieType = "Human" | "Cat" | "Alien" | "Agent";
export type RPSType = "Human" | "Cat" | "Alien";

export type NormieTraits = {
  Type?: NormieType;
  Gender?: string;
  Age?: string;
  "Hair Style"?: string;
  "Facial Feature"?: string;
  Eyes?: string;
  Expression?: string;
  Accessory?: string;
  [key: string]: string | number | boolean | undefined;
};

export type NormieMetadataAttribute = {
  trait_type: string;
  value: string | number | boolean;
};

export type NormieMetadata = {
  name?: string;
  description?: string;
  image?: string;
  attributes?: NormieMetadataAttribute[];
  [key: string]: unknown;
};

export type Normie = {
  id: number;
  image: string;
  svg: string;
  traits: NormieTraits;
  metadata?: NormieMetadata;
};

export const EXPRESSIONS = ["Smile", "Frown", "Angry", "Surprised", "Neutral", "Smirk", "Sleepy"] as const;
export type NormieExpression = (typeof EXPRESSIONS)[number];
export const RPS_TYPES: RPSType[] = ["Human", "Cat", "Alien"];
