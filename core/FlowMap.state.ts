import {viewport} from '@mapbox/geo-viewport';
import {easeCubic} from 'd3-ease';
import {Reducer, useMemo, useReducer} from 'react';
import {FlyToInterpolator} from 'react-map-gl';
import {Props as TooltipProps} from './Tooltip';
import {parseBoolConfigProp, parseNumberConfigProp} from './config';
import {Config, ConfigPropName, Flow, ViewportProps} from './types';

export const MIN_ZOOM_LEVEL = 0;
export const MAX_ZOOM_LEVEL = 20;
export const MIN_PITCH = 0;
export const MAX_PITCH = +60;

export function mapTransition(duration: number = 500) {
  return {
    transitionDuration: duration,
    transitionInterpolator: new FlyToInterpolator(),
    transitionEasing: easeCubic,
  };
}

export enum HighlightType {
  LOCATION = 'location',
  FLOW = 'flow',
}

export interface LocationHighlight {
  type: HighlightType.LOCATION;
  locationId: string;
}

export interface FlowHighlight {
  type: HighlightType.FLOW;
  flow: Flow;
}

export enum LocationFilterMode {
  ALL = 'ALL',
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  BETWEEN = 'BETWEEN',
}

export type Highlight = LocationHighlight | FlowHighlight;

export interface State {
  viewport: ViewportProps;
  adjustViewportToLocations: boolean;
  tooltip?: TooltipProps;
  highlight?: Highlight;
  selectedLocations: string[] | undefined;
  selectedTimeRange: [Date, Date] | undefined;
  locationFilterMode: LocationFilterMode;
  animationEnabled: boolean;
  fadeEnabled: boolean;
  locationTotalsEnabled: boolean;
  adaptiveScalesEnabled: boolean;
  clusteringEnabled: boolean;
  clusteringAuto: boolean;
  manualClusterZoom?: number;
  baseMapEnabled: boolean;
  darkMode: boolean;
  fadeAmount: number;
  baseMapOpacity: number;
  colorSchemeKey: string | undefined;
  selectedFlowsSheet: string | undefined;
}

export enum ActionType {
  SET_VIEWPORT = 'SET_VIEWPORT',
  ZOOM_IN = 'ZOOM_IN',
  ZOOM_OUT = 'ZOOM_OUT',
  RESET_BEARING_PITCH = 'RESET_BEARING_PITCH',
  SET_HIGHLIGHT = 'SET_HIGHLIGHT',
  SET_TOOLTIP = 'SET_TOOLTIP',
  CLEAR_SELECTION = 'CLEAR_SELECTION',
  SELECT_LOCATION = 'SELECT_LOCATION',
  SET_SELECTED_LOCATIONS = 'SET_SELECTED_LOCATIONS',
  SET_LOCATION_FILTER_MODE = 'SET_LOCATION_FILTER_MODE',
  SET_TIME_RANGE = 'SET_TIME_RANGE',
  SET_CLUSTERING_ENABLED = 'SET_CLUSTERING_ENABLED',
  SET_CLUSTERING_AUTO = 'SET_CLUSTERING_AUTO',
  SET_MANUAL_CLUSTER_ZOOM = 'SET_MANUAL_CLUSTER_ZOOM',
  SET_ANIMATION_ENABLED = 'SET_ANIMATION_ENABLED',
  SET_LOCATION_TOTALS_ENABLED = 'SET_LOCATION_TOTALS_ENABLED',
  SET_ADAPTIVE_SCALES_ENABLED = 'SET_ADAPTIVE_SCALES_ENABLED',
  SET_DARK_MODE = 'SET_DARK_MODE',
  SET_FADE_ENABLED = 'SET_FADE_ENABLED',
  SET_BASE_MAP_ENABLED = 'SET_BASE_MAP_ENABLED',
  SET_FADE_AMOUNT = 'SET_FADE_AMOUNT',
  SET_BASE_MAP_OPACITY = 'SET_BASE_MAP_OPACITY',
  SET_COLOR_SCHEME = 'SET_COLOR_SCHEME',
}

export type Action =
  | {
      type: ActionType.SET_VIEWPORT;
      viewport: ViewportProps;
      adjustViewportToLocations?: boolean;
    }
  | {
      type: ActionType.ZOOM_IN;
    }
  | {
      type: ActionType.ZOOM_OUT;
    }
  | {
      type: ActionType.RESET_BEARING_PITCH;
    }
  | {
      type: ActionType.SET_HIGHLIGHT;
      highlight: Highlight | undefined;
    }
  | {
      type: ActionType.CLEAR_SELECTION;
    }
  | {
      type: ActionType.SELECT_LOCATION;
      locationId: string;
      incremental: boolean;
    }
  | {
      type: ActionType.SET_SELECTED_LOCATIONS;
      selectedLocations: string[] | undefined;
    }
  | {
      type: ActionType.SET_LOCATION_FILTER_MODE;
      mode: LocationFilterMode;
    }
  | {
      type: ActionType.SET_TIME_RANGE;
      range: [Date, Date];
    }
  | {
      type: ActionType.SET_TOOLTIP;
      tooltip: TooltipProps | undefined;
    }
  | {
      type: ActionType.SET_CLUSTERING_ENABLED;
      clusteringEnabled: boolean;
    }
  | {
      type: ActionType.SET_CLUSTERING_AUTO;
      clusteringAuto: boolean;
    }
  | {
      type: ActionType.SET_ANIMATION_ENABLED;
      animationEnabled: boolean;
    }
  | {
      type: ActionType.SET_LOCATION_TOTALS_ENABLED;
      locationTotalsEnabled: boolean;
    }
  | {
      type: ActionType.SET_ADAPTIVE_SCALES_ENABLED;
      adaptiveScalesEnabled: boolean;
    }
  | {
      type: ActionType.SET_DARK_MODE;
      darkMode: boolean;
    }
  | {
      type: ActionType.SET_FADE_ENABLED;
      fadeEnabled: boolean;
    }
  | {
      type: ActionType.SET_BASE_MAP_ENABLED;
      baseMapEnabled: boolean;
    }
  | {
      type: ActionType.SET_FADE_AMOUNT;
      fadeAmount: number;
    }
  | {
      type: ActionType.SET_BASE_MAP_OPACITY;
      baseMapOpacity: number;
    }
  | {
      type: ActionType.SET_MANUAL_CLUSTER_ZOOM;
      manualClusterZoom: number | undefined;
    }
  | {
      type: ActionType.SET_COLOR_SCHEME;
      colorSchemeKey: string;
    };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SET_VIEWPORT: {
      const {viewport, adjustViewportToLocations} = action;
      return {
        ...state,
        viewport: {
          ...viewport,
          zoom: Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, viewport.zoom)),
        },
        tooltip: undefined,
        highlight: undefined,
        ...(adjustViewportToLocations != null && {
          adjustViewportToLocations: false,
        }),
      };
    }
    case ActionType.ZOOM_IN: {
      const {viewport} = state;
      return {
        ...state,
        viewport: {
          ...viewport,
          zoom: Math.min(MAX_ZOOM_LEVEL, viewport.zoom * 1.1),
        },
        tooltip: undefined,
        highlight: undefined,
      };
    }
    case ActionType.ZOOM_OUT: {
      const {viewport} = state;
      return {
        ...state,
        viewport: {
          ...viewport,
          zoom: Math.max(MIN_ZOOM_LEVEL, viewport.zoom / 1.1),
        },
        tooltip: undefined,
        highlight: undefined,
      };
    }
    case ActionType.RESET_BEARING_PITCH: {
      const {viewport} = state;
      return {
        ...state,
        viewport: {
          ...viewport,
          bearing: 0,
          pitch: 0,
          ...mapTransition(500),
        },
      };
    }
    case ActionType.SET_HIGHLIGHT: {
      const {highlight} = action;
      return {
        ...state,
        highlight,
      };
    }
    case ActionType.SET_TOOLTIP: {
      const {tooltip} = action;
      return {
        ...state,
        tooltip,
      };
    }
    case ActionType.CLEAR_SELECTION: {
      return {
        ...state,
        selectedLocations: undefined,
        locationFilterMode: LocationFilterMode.ALL,
        highlight: undefined,
        tooltip: undefined,
      };
    }
    case ActionType.SET_SELECTED_LOCATIONS: {
      const {selectedLocations} = action;
      const isEmpty = !selectedLocations || selectedLocations.length === 0;
      if (isEmpty) {
        return {
          ...state,
          locationFilterMode: LocationFilterMode.ALL,
          selectedLocations: undefined,
        };
      }
      return {
        ...state,
        selectedLocations,
      };
    }
    case ActionType.SET_LOCATION_FILTER_MODE: {
      const {mode} = action;
      return {
        ...state,
        locationFilterMode: mode,
      };
    }
    case ActionType.SET_TIME_RANGE: {
      const {range} = action;
      return {
        ...state,
        selectedTimeRange: range,
      };
    }
    case ActionType.SELECT_LOCATION: {
      const {selectedLocations} = state;
      const {locationId, incremental} = action;
      let nextSelectedLocations;
      if (selectedLocations) {
        const idx = selectedLocations.findIndex((id) => id === locationId);
        if (idx >= 0) {
          nextSelectedLocations = selectedLocations.slice();
          nextSelectedLocations.splice(idx, 1);
          if (nextSelectedLocations.length === 0) nextSelectedLocations = undefined;
        } else {
          if (incremental) {
            nextSelectedLocations = [...selectedLocations, locationId];
          } else {
            nextSelectedLocations = [locationId];
          }
        }
      } else {
        nextSelectedLocations = [locationId];
      }
      return {
        ...state,
        selectedLocations: nextSelectedLocations,
        ...(!nextSelectedLocations && {
          locationFilterMode: LocationFilterMode.ALL,
        }),
        highlight: undefined,
        tooltip: undefined,
      };
    }
    case ActionType.SET_CLUSTERING_ENABLED: {
      const {clusteringEnabled} = action;
      return {
        ...state,
        clusteringEnabled,
      };
    }
    case ActionType.SET_CLUSTERING_AUTO: {
      const {clusteringAuto} = action;
      return {
        ...state,
        clusteringAuto,
      };
    }
    case ActionType.SET_ANIMATION_ENABLED: {
      const {animationEnabled} = action;
      return {
        ...state,
        animationEnabled,
      };
    }
    case ActionType.SET_LOCATION_TOTALS_ENABLED: {
      const {locationTotalsEnabled} = action;
      return {
        ...state,
        locationTotalsEnabled,
      };
    }
    case ActionType.SET_ADAPTIVE_SCALES_ENABLED: {
      const {adaptiveScalesEnabled} = action;
      return {
        ...state,
        adaptiveScalesEnabled,
      };
    }
    case ActionType.SET_DARK_MODE: {
      const {darkMode} = action;
      return {
        ...state,
        darkMode,
      };
    }
    case ActionType.SET_FADE_ENABLED: {
      const {fadeEnabled} = action;
      return {
        ...state,
        fadeEnabled,
      };
    }
    case ActionType.SET_BASE_MAP_ENABLED: {
      const {baseMapEnabled} = action;
      return {
        ...state,
        baseMapEnabled,
      };
    }
    case ActionType.SET_FADE_AMOUNT: {
      const {fadeAmount} = action;
      return {
        ...state,
        fadeAmount,
      };
    }
    case ActionType.SET_BASE_MAP_OPACITY: {
      const {baseMapOpacity} = action;
      return {
        ...state,
        baseMapOpacity,
      };
    }
    case ActionType.SET_MANUAL_CLUSTER_ZOOM: {
      const {manualClusterZoom} = action;
      return {
        ...state,
        clusteringAuto: false,
        manualClusterZoom,
      };
    }
    case ActionType.SET_COLOR_SCHEME: {
      const {colorSchemeKey} = action;
      return {
        ...state,
        colorSchemeKey,
      };
    }
  }
  return state;
};

export const useFlowmapState = (config: Config) => {
  const initialState = useMemo<State>(() => getInitialState(config), [config]);

  const [state, dispatch] = useReducer<Reducer<State, Action>>(reducer, initialState);

  return {
    state,
    setViewportAction: (viewport: ViewportProps, adjustViewportToLocations?: boolean) =>
      dispatch({
        type: ActionType.SET_VIEWPORT,
        viewport,
        adjustViewportToLocations,
      }),
    enableClusteringAction: (clusteringEnabled: boolean) => {
      dispatch({
        type: ActionType.SET_CLUSTERING_ENABLED,
        clusteringEnabled,
      });
    },
    enableClusteringAutoAction: () => {
      dispatch({
        type: ActionType.SET_CLUSTERING_AUTO,
        clusteringAuto: true,
      });
    },
    enableClusteringManualAction: (manualClusterZoom?: number) => {
      dispatch({
        type: ActionType.SET_MANUAL_CLUSTER_ZOOM,
        manualClusterZoom,
      });
    },
    setTooltipAction: (tooltip: TooltipProps | undefined) => {
      dispatch({
        type: ActionType.SET_TOOLTIP,
        tooltip,
      });
    },
    hideTooltipAction: () => {
      dispatch({
        type: ActionType.SET_TOOLTIP,
        tooltip: undefined,
      });
    },
    setHighlightAction: (highlight: Highlight | undefined) => {
      dispatch({type: ActionType.SET_HIGHLIGHT, highlight});
    },
    zoomInAction: () => {
      dispatch({type: ActionType.ZOOM_IN});
    },
    zoomOutAction: () => {
      dispatch({type: ActionType.ZOOM_OUT});
    },
    resetBearingPitchAction: () => {
      dispatch({type: ActionType.RESET_BEARING_PITCH});
    },
    setSelectedLocationsAction: (selectedLocations: string[] | undefined) => {
      dispatch({
        type: ActionType.SET_SELECTED_LOCATIONS,
        selectedLocations,
      });
    },
    setLocationFilterModeAction: (mode: LocationFilterMode) => {
      dispatch({
        type: ActionType.SET_LOCATION_FILTER_MODE,
        mode,
      });
    },
    setViewStateAction: ({viewState}: {viewState: ViewportProps}) => {
      dispatch({
        type: ActionType.SET_VIEWPORT,
        viewport: viewState,
      });
    },
    selectLocationAction: (locationId: string, incremental: boolean) => {
      dispatch({
        type: ActionType.SELECT_LOCATION,
        locationId,
        incremental,
      });
    },
    setDarkModeAction: (darkMode: boolean) => {
      dispatch({
        type: ActionType.SET_DARK_MODE,
        darkMode,
      });
    },
    setFadeAction: (fadeEnabled: boolean) => {
      dispatch({
        type: ActionType.SET_FADE_ENABLED,
        fadeEnabled,
      });
    },
    setFadeAmountAction: (fadeAmount: number) => {
      dispatch({
        type: ActionType.SET_FADE_AMOUNT,
        fadeAmount,
      });
    },
    setBaseMapOpacityAction: (baseMapOpacity: number) => {
      dispatch({
        type: ActionType.SET_BASE_MAP_OPACITY,
        baseMapOpacity,
      });
    },
    setBaseMapAction: (baseMapEnabled: boolean) => {
      dispatch({
        type: ActionType.SET_BASE_MAP_ENABLED,
        baseMapEnabled,
      });
    },
    setAdaptiveScalesAction: (adaptiveScalesEnabled: boolean) => {
      dispatch({
        type: ActionType.SET_ADAPTIVE_SCALES_ENABLED,
        adaptiveScalesEnabled,
      });
    },
    setLocationTotalsEnabledAction: (locationTotalsEnabled: boolean) => {
      dispatch({
        type: ActionType.SET_LOCATION_TOTALS_ENABLED,
        locationTotalsEnabled,
      });
    },
    setAnimationEnabledAction: (animationEnabled: boolean) => {
      dispatch({
        type: ActionType.SET_ANIMATION_ENABLED,
        animationEnabled,
      });
    },
    setColorSchemeAction: (colorSchemeKey: string) => {
      dispatch({
        type: ActionType.SET_COLOR_SCHEME,
        colorSchemeKey,
      });
    },
  };
};

export function getInitialViewport(bbox: [number, number, number, number]) {
  const width = globalThis.innerWidth;
  const height = globalThis.innerHeight;
  const {
    center: [longitude, latitude],
    zoom,
  } = viewport(bbox, [width, height], undefined, undefined, 512, true);
  return {
    width,
    height,
    longitude,
    latitude,
    zoom,
    minZoom: MIN_ZOOM_LEVEL,
    maxZoom: MAX_ZOOM_LEVEL,
    minPitch: MIN_PITCH,
    maxPitch: MAX_PITCH,
    bearing: 0,
    pitch: 0,
    altitude: 1.5,
  };
}

export const DEFAULT_VIEWPORT = getInitialViewport([-180, -70, 180, 70]);

export function getInitialState(config: Config) {
  const draft = {
    viewport: DEFAULT_VIEWPORT,
    adjustViewportToLocations: true,
    selectedLocations: undefined,
    locationTotalsEnabled: true,
    locationFilterMode: LocationFilterMode.ALL,
    baseMapEnabled: true,
    adaptiveScalesEnabled: true,
    animationEnabled: parseBoolConfigProp(config[ConfigPropName.ANIMATE_FLOWS]),
    clusteringEnabled: parseBoolConfigProp(config[ConfigPropName.CLUSTER_ON_ZOOM] || 'true'),
    manualClusterZoom: undefined,
    fadeEnabled: true,
    clusteringAuto: true,
    darkMode: parseBoolConfigProp(config[ConfigPropName.COLORS_DARK_MODE] || 'true'),
    fadeAmount: parseNumberConfigProp(config[ConfigPropName.FADE_AMOUNT], 50),
    baseMapOpacity: parseNumberConfigProp(config[ConfigPropName.BASE_MAP_OPACITY], 75),
    colorSchemeKey: config[ConfigPropName.COLORS_SCHEME],
    selectedFlowsSheet: undefined,
    selectedTimeRange: undefined,
  };

  return draft;
}
