import {Button, Popover, Slider, Switch} from '@blueprintjs/core';
import {IconNames} from '@blueprintjs/icons';
import styled from '@emotion/styled';
import * as React from 'react';
import {Column, LegendTitle, Row} from './Boxes';
import ColorSchemeSelector from './ColorSchemeSelector';
import {State} from './FlowMap.state';

const SettingsOuter = styled.div`
  width: 290px;
  font-size: 12px;
`;

const StyledSwitch = styled(Switch)`
  margin-bottom: 0;
  align-self: flex-start;
  white-space: nowrap;
`;

interface Props {
  state: State;
  darkMode: boolean;
  clusterZoom: number | undefined;
  availableClusterZoomLevels: number[] | undefined;
  enableClusteringAction: (clusteringEnabled: boolean) => void;
  handleChangeClusteringAuto: (value: boolean) => void;
  enableClusteringManualAction: (manualClusterZoom?: number) => void;
  setDarkModeAction: (darkMode: boolean) => void;
  setFadeAction: (fadeEnabled: boolean) => void;
  setFadeAmountAction: (fadeAmount: number) => void;
  setBaseMapOpacityAction: (baseMapOpacity: number) => void;
  setBaseMapAction: (baseMapEnabled: boolean) => void;
  setAdaptiveScalesAction: (adaptiveScalesEnabled: boolean) => void;
  setLocationTotalsEnabledAction: (locationTotalsEnabled: boolean) => void;
  setAnimationEnabledAction: (animationEnabled: boolean) => void;
  setColorSchemeAction: (colorSchemeKey: string) => void;
}

const SettingsPopover: React.FC<Props> = ({
  state,
  darkMode,
  clusterZoom,
  availableClusterZoomLevels,
  enableClusteringAction,
  handleChangeClusteringAuto,
  enableClusteringManualAction,
  setDarkModeAction,
  setFadeAction,
  setFadeAmountAction,
  setBaseMapOpacityAction,
  setBaseMapAction,
  setAdaptiveScalesAction,
  setLocationTotalsEnabledAction,
  setAnimationEnabledAction,
  setColorSchemeAction,
}) => {
  return (
    <Popover
      usePortal={false}
      hoverOpenDelay={0}
      hoverCloseDelay={0}
      content={
        <SettingsOuter>
          <Column spacing={10} padding="12px 20px">
            <LegendTitle>Settings</LegendTitle>
            <Row spacing={5}>
              <div style={{whiteSpace: 'nowrap'}}>Color scheme</div>
              <ColorSchemeSelector
                selected={state.colorSchemeKey}
                reverse={darkMode}
                onChange={setColorSchemeAction}
              />
            </Row>
            <Column spacing={10}>
              <StyledSwitch
                checked={state.darkMode}
                label="Dark mode"
                onChange={(ev) => setDarkModeAction((ev.target as HTMLInputElement).checked)}
              />
              <Row spacing={15}>
                <StyledSwitch
                  checked={state.fadeEnabled}
                  label="Fade"
                  onChange={(ev) => setFadeAction((ev.target as HTMLInputElement).checked)}
                />
                {state.fadeEnabled && (
                  <Slider
                    value={state.fadeAmount}
                    min={0}
                    max={100}
                    stepSize={1}
                    labelRenderer={false}
                    showTrackFill={false}
                    onChange={setFadeAmountAction}
                  />
                )}
              </Row>
              <Row spacing={15}>
                <StyledSwitch
                  checked={state.baseMapEnabled}
                  label="Base map"
                  onChange={(ev) => setBaseMapAction((ev.target as HTMLInputElement).checked)}
                />
                {state.baseMapEnabled && (
                  <Slider
                    value={state.baseMapOpacity}
                    min={0}
                    max={100}
                    stepSize={1}
                    labelRenderer={false}
                    showTrackFill={false}
                    onChange={setBaseMapOpacityAction}
                  />
                )}
              </Row>
              <StyledSwitch
                checked={state.animationEnabled}
                label="Animate flows"
                onChange={(ev) =>
                  setAnimationEnabledAction((ev.target as HTMLInputElement).checked)
                }
              />
              <StyledSwitch
                checked={state.adaptiveScalesEnabled}
                label="Dynamic range adjustment"
                onChange={(ev) => setAdaptiveScalesAction((ev.target as HTMLInputElement).checked)}
              />
              <StyledSwitch
                checked={state.locationTotalsEnabled}
                label="Location totals"
                onChange={(ev) =>
                  setLocationTotalsEnabledAction((ev.target as HTMLInputElement).checked)
                }
              />
              {availableClusterZoomLevels && (
                <>
                  <Row spacing={15}>
                    <StyledSwitch
                      checked={state.clusteringEnabled}
                      label="Clustering"
                      onChange={(ev) =>
                        enableClusteringAction((ev.target as HTMLInputElement).checked)
                      }
                    />
                    {state.clusteringEnabled && (
                      <StyledSwitch
                        checked={state.clusteringAuto}
                        innerLabel={state.clusteringAuto ? 'Auto' : 'Manual'}
                        onChange={(ev) =>
                          handleChangeClusteringAuto((ev.target as HTMLInputElement).checked)
                        }
                      />
                    )}
                  </Row>
                  {state.clusteringEnabled && !state.clusteringAuto && (
                    <Row spacing={15}>
                      <div style={{whiteSpace: 'nowrap', marginLeft: 38}}>Level</div>
                      <Slider
                        value={
                          availableClusterZoomLevels.length -
                          1 -
                          availableClusterZoomLevels.indexOf(
                            state.manualClusterZoom != null
                              ? state.manualClusterZoom
                              : clusterZoom || 0,
                          )
                        }
                        min={0}
                        max={availableClusterZoomLevels.length - 1}
                        stepSize={1}
                        labelRenderer={false}
                        showTrackFill={false}
                        onChange={(index: number) => {
                          enableClusteringManualAction(
                            availableClusterZoomLevels
                              ? availableClusterZoomLevels[
                                  availableClusterZoomLevels.length - 1 - index
                                ]
                              : undefined,
                          );
                        }}
                      />
                    </Row>
                  )}
                </>
              )}
            </Column>
          </Column>
        </SettingsOuter>
      }
    >
      <Button title="Settings…" icon={IconNames.COG} />
    </Popover>
  );
};

export default SettingsPopover;
