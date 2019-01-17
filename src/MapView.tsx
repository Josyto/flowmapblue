import * as React from 'react'
import FlowMap from './FlowMap';
import sheetFetcher, { makeSheetQueryUrl } from './sheetFetcher';
import { PromiseState } from 'react-refetch';
import { Config, ConfigProp, ConfigPropName } from './types';
import { Absolute } from './Boxes';
import Logo from './Logo';

interface Props {
  spreadSheetKey: string
}

type PropsWithData = Props & {
  configFetch: PromiseState<Config>,
}


const DEFAULT_CONFIG: Config = {
  [ConfigPropName.MAPBOX_ACCESS_TOKEN]: process.env.REACT_APP_MapboxAccessToken,
  [ConfigPropName.TITLE]: undefined,
  [ConfigPropName.SOURCE_NAME]: undefined,
  [ConfigPropName.SOURCE_URL]: undefined,
  [ConfigPropName.DESCRIPTION]: undefined,
}

const MapView = ({ spreadSheetKey, configFetch }: PropsWithData) => {
  return (
    <>
      {!configFetch.pending && !configFetch.refreshing &&
      <FlowMap
        spreadSheetKey={spreadSheetKey}
        config={configFetch.fulfilled ? configFetch.value : DEFAULT_CONFIG}
      />}
      <Absolute top={10} left={10}>
        <Logo />
      </Absolute>
    </>
  )
}

export default sheetFetcher<any>(({ spreadSheetKey }: Props) => ({
  configFetch: {
    url: makeSheetQueryUrl(spreadSheetKey, 'properties', 'SELECT A,B'),
    then: (props: ConfigProp[]) => {
      const value = {...DEFAULT_CONFIG}
      for (const prop of props) {
        if (prop.value != null && `${prop.value}`.length > 0) {
          value[prop.property] = prop.value
        }
      }
      return { value }
    },
  } as any
}))(MapView)