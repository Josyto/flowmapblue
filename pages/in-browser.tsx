import {Button, H5, Intent, TextArea} from '@blueprintjs/core';
import {IconNames} from '@blueprintjs/icons';
import styled from '@emotion/styled';
import md5 from 'blueimp-md5';
import {dsvFormat} from 'd3-dsv';
import {FLOWS} from 'data/flows';
import {LOCATIONS} from 'data/locations';
import {useRouter} from 'next/router';
import {useState} from 'react';
import {PromiseState} from 'react-refetch';
import FlowMap, {DEFAULT_CONFIG, Flow, Location, MapContainer, prepareFlows} from '../core';
import Layout from '../core/Layout';

interface DataProps {
  locations: Location[];
  flows: Flow[];
}

const FlowMapContainer = (props: DataProps) => {
  const {flows, locations} = props;
  return (
    <MapContainer>
      <FlowMap
        flowsFetch={PromiseState.resolve(flows)}
        locationsFetch={PromiseState.resolve(locations)}
        config={DEFAULT_CONFIG}
        spreadSheetKey={undefined}
        flowsSheet={undefined}
      />
    </MapContainer>
  );
};

const ButtonArea = styled.div`
  text-align: right;
`;

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: min-content 1fr min-content;
  column-gap: 1rem;
  row-gap: 0.5rem;
  align-items: center;
  & > textarea {
    min-height: 350px;
    height: 100%;
    font-size: 12px !important;
    white-space: pre;
    font-family: monospace;
  }
`;

const InBrowserFlowMap = () => {
  const [locationsCsv, setLocationsCsv] = useState(LOCATIONS);
  const [flowsCsv, setFlowsCsv] = useState(FLOWS);
  const router = useRouter();
  const {hash} = router.query;
  const [data, setData] = useState<DataProps>();
  const handleVisualize = () => {
    const data = {
      locations: dsvFormat(',').parse(locationsCsv, (row: any) => ({
        ...row,
        lat: +row.lat,
        lon: +row.lon,
      })),
      flows: prepareFlows(dsvFormat(',').parse(flowsCsv)),
    };
    setData(data);
    router.push({
      // Change the URL so that users can go back to data editing
      query: {
        hash: md5(JSON.stringify(data)),
      },
    });
  };
  return data && hash ? (
    <FlowMapContainer {...data} />
  ) : (
    <Layout>
      <h1>In-browser flow map</h1>
      <section>
        <p>
          With this tool you can visualize OD-data as a flow map directly in your browser without
          the need to upload it to Google Sheets. The data will remain in your browser and{' '}
          <i>will not be uploaded anywhere</i>. Note that the visualization will be lost as soon as
          you close the browser window with it. There will be no URL to come back to or to share
          with other people.
        </p>
      </section>
      <Container>
        <H5>Locations CSV</H5>
        <H5>Flows CSV</H5>
        <TextArea
          growVertically={false}
          large={true}
          intent={Intent.PRIMARY}
          onChange={(event) => setLocationsCsv(event.target.value)}
          value={locationsCsv}
        />
        <TextArea
          growVertically={false}
          large={true}
          intent={Intent.PRIMARY}
          onChange={(event) => setFlowsCsv(event.target.value)}
          value={flowsCsv}
        />
      </Container>
      <ButtonArea>
        <Button icon={IconNames.CHART} large={true} onClick={handleVisualize}>
          Visualize
        </Button>
      </ButtonArea>
    </Layout>
  );
};

export default InBrowserFlowMap;
