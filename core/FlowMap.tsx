import {Button, ButtonGroup, Classes, Colors} from '@blueprintjs/core';
import {IconNames} from '@blueprintjs/icons';
import {MapController, MapView} from '@deck.gl/core';
import {DeckGL} from '@deck.gl/react';
import styled from '@emotion/styled';
import {findAppropriateZoomLevel} from '@flowmap.gl/cluster';
import FlowMapLayer, {
  FlowLayerPickingInfo,
  FlowPickingInfo,
  LocationPickingInfo,
  PickingType,
} from '@flowmap.gl/core';
import {getViewStateForLocations} from '@flowmap.gl/react';
import WebMercatorViewport from '@math.gl/web-mercator';
import {FC, ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {_MapContext as MapContext, StaticMap} from 'react-map-gl';
import {alea} from 'seedrandom';
import {Absolute, BoxStyle, Column} from './Boxes';
import {
  NUMBER_OF_FLOWS_TO_DISPLAY,
  getAvailableClusterZoomLevels,
  getClusterIndex,
  getClusterZoom,
  getDarkMode,
  getDiffMode,
  getFlowMagnitudeExtent,
  getFlowMapColors,
  getFlowsForFlowMapLayer,
  getLocationTotals,
  getLocationTotalsExtent,
  getLocations,
  getLocationsForFlowMapLayer,
  getLocationsForSearchBox,
  getLocationsHavingFlows,
  getMaxLocationCircleSize,
} from './FlowMap.selectors';
import {
  HighlightType,
  LocationFilterMode,
  MAX_PITCH,
  MAX_ZOOM_LEVEL,
  MIN_PITCH,
  MIN_ZOOM_LEVEL,
  State,
  mapTransition,
  useFlowmapState,
} from './FlowMap.state';
import LoadingSpinner from './LoadingSpinner';
import LocationsSearchBox from './LocationSearchBox';
import Message from './Message';
import NoScrollContainer from './NoScrollContainer';
import SettingsPopover from './SettingsPopover';
import Tooltip, {TargetBounds} from './Tooltip';
import {FlowTooltipContent, LocationTooltipContent} from './TooltipContent';
import useDebounced from './hooks';
import {
  AsyncState,
  Config,
  ConfigPropName,
  Flow,
  Location,
  getFlowDestId,
  getFlowMagnitude,
  getFlowOriginId,
  getLocationCentroid,
  getLocationId,
} from './types';

const CONTROLLER_OPTIONS = {
  type: MapController,
  doubleClickZoom: false,
  dragRotate: true,
  touchRotate: true,
  minZoom: MIN_ZOOM_LEVEL,
  maxZoom: MAX_ZOOM_LEVEL,
};

export type Props = {
  embed?: boolean;
  config: Config;
  locationsFetch: AsyncState<Location[]>;
  flowsFetch: AsyncState<Flow[]>;
  spreadSheetKey: string | undefined;
  flowsSheet: string | undefined;
  onSetFlowsSheet?: (sheet: string) => void;
};

/* This is temporary until mixBlendMode style prop works in <DeckGL> as before v8 */
const DeckGLOuter = styled.div<{
  darkMode: boolean;
  baseMapOpacity: number;
  cursor: 'crosshair' | 'pointer' | undefined;
}>(
  ({cursor, baseMapOpacity, darkMode}) => `
  & #deckgl-overlay {
    mix-blend-mode: ${darkMode ? 'screen' : 'multiply'};
  }
  & .mapboxgl-map {
    opacity: ${baseMapOpacity}
  }
  ${cursor != null ? `& #view-default-view { cursor: ${cursor}; }` : ''},
`,
);

export const MAX_NUM_OF_IDS_IN_ERROR = 100;

const FlowMap: FC<Props> = (props) => {
  const {embed, config, spreadSheetKey, locationsFetch, flowsFetch} = props;
  const deckRef = useRef<any>();

  const outerRef = useRef<HTMLDivElement>(null);
  const {
    state,
    setViewportAction,
    enableClusteringAction,
    enableClusteringAutoAction,
    enableClusteringManualAction,
    setTooltipAction,
    hideTooltipAction,
    setHighlightAction,
    zoomInAction,
    zoomOutAction,
    resetBearingPitchAction,
    setSelectedLocationsAction,
    setLocationFilterModeAction,
    setViewStateAction,
    selectLocationAction,
    setDarkModeAction,
    setFadeAction,
    setFadeAmountAction,
    setBaseMapOpacityAction,
    setBaseMapAction,
    setAdaptiveScalesAction,
    setLocationTotalsEnabledAction,
    setAnimationEnabledAction,
    setColorSchemeAction,
  } = useFlowmapState(config);

  const {viewport, tooltip, animationEnabled, baseMapEnabled} = state;
  const allLocations = getLocations(state, props);
  const locationsHavingFlows = getLocationsHavingFlows(state, props);
  const locations = getLocationsForFlowMapLayer(state, props);
  const flows = getFlowsForFlowMapLayer(state, props);

  const [time, setTime] = useState(0);

  // Use useRef for mutable variables that we want to persist
  // without triggering a re-render on their change
  const requestAnimationFrameRef = useRef<number>();

  const animate = useCallback(
    (time: number) => {
      const loopLength = 1800;
      const animationSpeed = 20;
      const loopTime = loopLength / animationSpeed;
      const timestamp = time / 1000;
      setTime(((timestamp % loopTime) / loopTime) * loopLength);
      requestAnimationFrameRef.current = requestAnimationFrame(animate);
    },
    [requestAnimationFrameRef, setTime],
  );

  useEffect(() => {
    if (animationEnabled) {
      requestAnimationFrameRef.current = requestAnimationFrame(animate);
    } else {
      const animationFrame = requestAnimationFrameRef.current;
      if (animationFrame != null && animationFrame > 0) {
        globalThis.cancelAnimationFrame(animationFrame);
        requestAnimationFrameRef.current = undefined;
      }
    }
    return () => {
      if (requestAnimationFrameRef.current != null) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
      }
    };
  }, [animationEnabled, animate]);

  const {adjustViewportToLocations} = state;

  useEffect(() => {
    if (!adjustViewportToLocations) {
      return;
    }

    const width = globalThis.innerWidth;
    const height = globalThis.innerHeight;
    if (allLocations != null) {
      let draft = getViewStateForLocations(
        locationsHavingFlows ?? allLocations,
        getLocationCentroid,
        [width, height],
        {pad: 0.1},
      );

      if (!draft.zoom) {
        draft = {
          zoom: 1,
          latitude: 0,
          longitude: 0,
        };
      }

      setViewportAction(
        {
          width,
          height,
          ...draft,
          minZoom: MIN_ZOOM_LEVEL,
          maxZoom: MAX_ZOOM_LEVEL,
          minPitch: MIN_PITCH,
          maxPitch: MAX_PITCH,
          bearing: 0,
          pitch: 0,
          altitude: 1.5,
          ...mapTransition(500),
        },
        false,
      );
    }
  }, [allLocations, locationsHavingFlows, adjustViewportToLocations, setViewportAction]);

  const clusterIndex = getClusterIndex(state, props);

  const handleChangeClusteringAuto = (isClusteringAuto: boolean) => {
    if (isClusteringAuto) {
      enableClusteringAutoAction();
      return;
    }

    if (clusterIndex) {
      const {availableZoomLevels} = clusterIndex;
      if (availableZoomLevels != null) {
        enableClusteringManualAction(
          findAppropriateZoomLevel(clusterIndex.availableZoomLevels, viewport.zoom),
        );
      }
    }
  };

  const getContainerClientRect = useCallback(() => {
    const container = outerRef.current;
    if (!container) return undefined;
    return container.getBoundingClientRect();
  }, [outerRef]);

  const getMercator = useCallback(() => {
    const containerBounds = getContainerClientRect();
    if (!containerBounds) return undefined;
    const {width, height} = containerBounds;
    return new WebMercatorViewport({
      ...viewport,
      width,
      height,
    });
  }, [viewport, getContainerClientRect]);

  const showTooltip = (bounds: TargetBounds, content: ReactNode) => {
    const containerBounds = getContainerClientRect();
    if (!containerBounds) return;
    const {top, left} = containerBounds;
    setTooltipAction({
      target: {
        ...bounds,
        left: left + bounds.left,
        top: top + bounds.top,
      },
      placement: 'top',
      content,
    });
  };

  const [showTooltipDebounced, cancelShowTooltipDebounced] = useDebounced(showTooltip, 500);
  const [highlightDebounced, cancelHighlightDebounced] = useDebounced(setHighlightAction, 500);

  const hideTooltip = () => {
    hideTooltipAction();
    cancelShowTooltipDebounced();
  };

  const showFlowTooltip = (pos: [number, number], info: FlowPickingInfo) => {
    const [x, y] = pos;
    const r = 5;
    const bounds = {
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
    };
    const content = (
      <FlowTooltipContent
        flow={info.object}
        origin={info.origin}
        dest={info.dest}
        config={config}
      />
    );
    if (state.tooltip) {
      showTooltip(bounds, content);
      cancelShowTooltipDebounced();
    } else {
      showTooltipDebounced(bounds, content);
    }
  };

  const showLocationTooltip = (info: LocationPickingInfo) => {
    const {object: location, circleRadius} = info;
    const mercator = getMercator();
    if (!mercator) return;
    const [x, y] = mercator.project(getLocationCentroid(location));
    const r = circleRadius + 5;
    const {selectedLocations} = state;
    const bounds = {
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
    };
    const content = (
      <LocationTooltipContent
        locationInfo={info}
        isSelectionEmpty={!selectedLocations}
        isSelected={
          selectedLocations && selectedLocations.find((id) => id === location.id) ? true : false
        }
        config={config}
      />
    );
    if (state.tooltip) {
      showTooltip(bounds, content);
      cancelShowTooltipDebounced();
    } else {
      showTooltipDebounced(bounds, content);
    }
  };

  const handleHover = (info: FlowLayerPickingInfo) => {
    const {type, object, x, y} = info;
    switch (type) {
      case PickingType.FLOW: {
        if (object) {
          setHighlightAction({
            type: HighlightType.FLOW,
            flow: object,
          });
          cancelHighlightDebounced();
          showFlowTooltip([x, y], info as FlowPickingInfo);
        } else {
          setHighlightAction(undefined);
          cancelHighlightDebounced();
          hideTooltip();
        }
        break;
      }
      case PickingType.LOCATION: {
        if (object) {
          highlightDebounced({
            type: HighlightType.LOCATION,
            locationId: getLocationId!(object),
          });
          showLocationTooltip(info as LocationPickingInfo);
        } else {
          setHighlightAction(undefined);
          cancelHighlightDebounced();
          hideTooltip();
        }
        break;
      }
      default: {
        setHighlightAction(undefined);
        cancelHighlightDebounced();
        hideTooltip();
      }
    }
  };

  if (locationsFetch.loading) {
    return <LoadingSpinner />;
  }

  if (locationsFetch.error || flowsFetch.error) {
    return (
      <Message>
        {spreadSheetKey ? (
          <>
            <p>
              Oops… Could not fetch data from{` `}
              <a href={`https://docs.google.com/spreadsheets/d/${spreadSheetKey}`}>
                this spreadsheet
              </a>
              .{` `}
            </p>
            <p>
              If you are the owner of this spreadsheet, make sure you have shared it by doing the
              following:
              <ol>
                <li>Click the “Share” button in the spreadsheet</li>
                <li>
                  Change the selection from “Restricted” to “Anyone with the link” in the drop-down
                  under “Get link”
                </li>
              </ol>
            </p>
          </>
        ) : (
          <p>Oops… Could not fetch data</p>
        )}
      </Message>
    );
  }

  const searchBoxLocations = getLocationsForSearchBox(state, props);
  const mapboxAccessToken = config[ConfigPropName.MAPBOX_ACCESS_TOKEN];
  const darkMode = getDarkMode(state, props);

  const getLayers = () => {
    const {animationEnabled, adaptiveScalesEnabled} = state;
    const layers = [];

    if (locations && flows) {
      const locationTotals = getLocationTotals(state, props);
      const highlight = getHighlightForZoom(state, props);
      layers.push(
        new FlowMapLayer({
          id: 'flow-map',
          animate: animationEnabled,
          animationCurrentTime: time,
          diffMode: getDiffMode(state, props),
          colors: getFlowMapColors(state, props),
          locations,
          flows,
          getFlowColor: (f: Flow) => f.color ?? undefined,
          showOnlyTopFlows: NUMBER_OF_FLOWS_TO_DISPLAY,
          getLocationCentroid,
          getFlowMagnitude,
          getFlowOriginId,
          getFlowDestId,
          getLocationId,
          getLocationTotalIn: (loc) => locationTotals?.get(loc.id)?.incoming || 0,
          getLocationTotalOut: (loc) => locationTotals?.get(loc.id)?.outgoing || 0,
          getLocationTotalWithin: (loc) => locationTotals?.get(loc.id)?.within || 0,
          getAnimatedFlowLineStaggering: (d: Flow) =>
            // @ts-ignore
            new alea(`${d.origin}-${d.dest}`)(),
          showTotals: true,
          maxLocationCircleSize: getMaxLocationCircleSize(state, props),
          maxFlowThickness: animationEnabled ? 18 : 12,
          ...(!adaptiveScalesEnabled && {
            flowMagnitudeExtent: getFlowMagnitudeExtent(state, props),
          }),
          // locationTotalsExtent needs to be always calculated, because locations
          // are not filtered by the viewport (e.g. the connected ones need to be included).
          // Also, the totals cannot be correctly calculated from the flows passed to the layer.
          locationTotalsExtent: getLocationTotalsExtent(state, props),
          highlightedLocationId:
            highlight && highlight.type === HighlightType.LOCATION
              ? highlight.locationId
              : undefined,
          highlightedFlow:
            highlight && highlight.type === HighlightType.FLOW ? highlight.flow : undefined,
          pickable: true,
          ...{
            onHover: handleHover,
            onClick: (
              info: FlowLayerPickingInfo,
              event: {
                srcEvent: MouseEvent;
              },
            ) => handleClick(info, event, selectLocationAction),
          },
          visible: true,
          updateTriggers: {
            onHover: handleHover, // to avoid stale closure in the handler
            onClick: (
              info: FlowLayerPickingInfo,
              event: {
                srcEvent: MouseEvent;
              },
            ) => handleClick(info, event, selectLocationAction),
          } as any,
        }),
      );
    }

    return layers;
  };

  return (
    <NoScrollContainer
      ref={outerRef}
      onMouseLeave={hideTooltip}
      className={darkMode ? Classes.DARK : undefined}
      style={{
        background: darkMode ? Colors.DARK_GRAY1 : Colors.LIGHT_GRAY5,
      }}
    >
      <DeckGLOuter
        darkMode={darkMode}
        baseMapOpacity={state.baseMapOpacity / 100}
        cursor={undefined}
      >
        <DeckGL
          ref={deckRef}
          controller={CONTROLLER_OPTIONS}
          viewState={viewport}
          views={[new MapView({id: 'map', repeat: true})]}
          onViewStateChange={(props: any) => setViewStateAction(props)}
          layers={getLayers()}
          ContextProvider={MapContext.Provider}
          parameters={{
            clearColor: darkMode ? [0, 0, 0, 1] : [255, 255, 255, 1],
          }}
        >
          {mapboxAccessToken && baseMapEnabled && (
            <StaticMap
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
              width="100%"
              height="100%"
            />
          )}
        </DeckGL>
      </DeckGLOuter>
      {flows && (
        <>
          {searchBoxLocations && (
            <Absolute top={10} right={50}>
              <BoxStyle darkMode={darkMode}>
                <LocationsSearchBox
                  locationFilterMode={state.locationFilterMode}
                  locations={searchBoxLocations}
                  selectedLocations={state.selectedLocations}
                  onSelectionChanged={(selectedLocations: string[] | undefined) =>
                    setSelectedLocationsAction(selectedLocations)
                  }
                  onLocationFilterModeChange={(mode: LocationFilterMode) =>
                    setLocationFilterModeAction(mode)
                  }
                />
              </BoxStyle>
            </Absolute>
          )}
          <Absolute top={10} right={10}>
            <Column spacing={10}>
              <ButtonGroup vertical={true}>
                <Button title="Zoom in" icon={IconNames.PLUS} onClick={zoomInAction} />
                <Button title="Zoom out" icon={IconNames.MINUS} onClick={zoomOutAction} />
                <Button
                  title="Reset bearing and pitch"
                  icon={IconNames.COMPASS}
                  onClick={resetBearingPitchAction}
                />
              </ButtonGroup>
            </Column>
          </Absolute>
        </>
      )}
      {!embed && (
        <Absolute bottom={10} left={10}>
          <SettingsPopover
            darkMode={darkMode}
            state={state}
            clusterZoom={getClusterZoom(state, props)}
            availableClusterZoomLevels={getAvailableClusterZoomLevels(state, props)}
            enableClusteringAction={enableClusteringAction}
            handleChangeClusteringAuto={handleChangeClusteringAuto}
            enableClusteringManualAction={enableClusteringManualAction}
            setDarkModeAction={setDarkModeAction}
            setFadeAction={setFadeAction}
            setFadeAmountAction={setFadeAmountAction}
            setBaseMapOpacityAction={setBaseMapOpacityAction}
            setBaseMapAction={setBaseMapAction}
            setAdaptiveScalesAction={setAdaptiveScalesAction}
            setLocationTotalsEnabledAction={setLocationTotalsEnabledAction}
            setAnimationEnabledAction={setAnimationEnabledAction}
            setColorSchemeAction={setColorSchemeAction}
          />
        </Absolute>
      )}
      {tooltip && <Tooltip {...tooltip} />}
      {flowsFetch.loading && <LoadingSpinner />}
    </NoScrollContainer>
  );
};

const handleClick = (
  info: FlowLayerPickingInfo,
  event: {srcEvent: MouseEvent},
  selectLocationAction: (locationId: string, incremental: boolean) => void,
) => {
  switch (info.type) {
    case PickingType.LOCATION:
    // fall through
    case PickingType.LOCATION_AREA: {
      const {object} = info;
      if (object) {
        selectLocationAction(getLocationId(object), event.srcEvent.shiftKey);
      }
      break;
    }
  }
};

const getHighlightForZoom = (state: State, props: Props) => {
  const {highlight, clusteringEnabled} = state;
  if (!highlight || !clusteringEnabled) {
    return highlight;
  }
  const clusterTree = getClusterIndex(state, props);
  const clusterZoom = getClusterZoom(state, props);
  if (!clusterTree || clusterZoom === undefined) {
    return undefined;
  }

  const isValidForClusterZoom = (itemId: string) => {
    const cluster = clusterTree.getClusterById(itemId);
    if (cluster) {
      return cluster.zoom === clusterZoom;
    } else {
      const minZoom = clusterTree.getMinZoomForLocation(itemId);
      if (minZoom === undefined || clusterZoom >= minZoom) {
        return true;
      }
    }
    return false;
  };

  switch (highlight.type) {
    case HighlightType.LOCATION:
      const {locationId} = highlight;
      return isValidForClusterZoom(locationId) ? highlight : undefined;

    case HighlightType.FLOW:
      const {
        flow: {origin, dest},
      } = highlight;
      if (isValidForClusterZoom(origin) && isValidForClusterZoom(dest)) {
        return highlight;
      }
      return undefined;
  }

  return undefined;
};

export default FlowMap;
