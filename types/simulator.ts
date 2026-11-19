export type TentTypeId = 'kerut' | 'transparan' | 'blukat' | 'piramid';

export type LayerRole = 'primary' | 'secondary' | 'tertiary' | 'accent';

export interface LayerPolygonConfig {
    id: string;
    name: string;
    role: LayerRole;
    polygons: [number, number][][];
    feather: number;
    defaultColor: string;
    defaultIntensity: number;
    defaultEnabled: boolean;
}

export interface LightPointConfig {
    x: number;
    y: number;
    radius: number;
    type: 'chandelier' | 'fairylight';
    color: string;
}

export interface TentTemplateConfig {
    id: TentTypeId;
    name: string;
    description: string;
    imageUrl: string;
    layers: LayerPolygonConfig[];
    lightPoints?: LightPointConfig[];
}

export interface ColorPreset {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    tertiary?: string;
}

export interface LayerState {
    color: string;
    intensity: number;
    enabled: boolean;
}

export type LightingMode = 'day' | 'night';
