import { Accordion, AccordionDetails, AccordionSummary, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, useTheme, makeStyles } from '@material-ui/core';
import * as React from 'react';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { listPageStyles } from '../List/style';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { ipcRenderer } from '../../services/ipcRenderer';
// import EnhancedTable from './Table';



/** interface for Form URL params */
interface DetailsURLParams {
  id: string;
}

const SELECT_ALL: string = 'select all that apply';
const SELECT_ONE = 'select one';


function FormDetails(props: RouteComponentProps<DetailsURLParams>) {
  const [formData, setFormData] = React.useState<any>([]);
  const [userData, setUserData] = React.useState<any>(null);

  const theme = useTheme();
  const useStyles = makeStyles(listPageStyles(theme));
  const classes = useStyles();

  const comUpdate = async () => {
    const { match } = props;
    const listId = match.params.id || '';
    const formData = await ipcRenderer.sendSync('form-details', listId);
    setUserData(formData.formDetails);
    let { data, form_id } = formData.formDetails;
    data = JSON.parse(data);
    const formDefinitionObj = await ipcRenderer.sendSync('fetch-form-definition', form_id);
    const simpleFormChoice = await ipcRenderer.sendSync('fetch-form-choices', form_id);
    console.log('-------------------- form choices ----------------');
    console.log(simpleFormChoice.length);
    if (formDefinitionObj != null) {
      const { definition, field_names, formChoices } = formDefinitionObj;
      createFormKeyValuePair(JSON.parse(definition), JSON.parse(field_names), data, { simpleFormChoice, formChoices: JSON.parse(formChoices)});
    }
    // setFormData(Object.entries(data));
  }

  const createFormKeyValuePair = (definition: any, fieldNames: any, data: any, choices: any) => {
    const formData: any[] = [];
    const userInput = Object.entries(data);
    fieldNames.forEach((element: any) => {
      const exist = userInput.find((obj: any) => obj[0] == element);
      if (exist) {
        let formField: any = {}
        if (exist[0].includes('/')) {
          const fields = exist[0].split('/');
          let children = definition.children
          for (let i = 0; i <= fields.length - 2; i++) {
            const groupObj = children.find((obj: any) => obj.name == fields[i]);
            if (groupObj) {
              children = groupObj.children;
            }
          }
          formField = children.find((obj: any) => obj.name == fields[fields.length - 1]);
        } else {
          formField = definition.children.find((obj: any) => obj.name == exist[0]);
        }
        if (formField) {
          formData.push({
            label: formField.label,
            value: getReadableValue(exist[1], formField, choices),
          })
          console.log(formField.label, exist[1]);
        }
      }
    });
    setFormData(formData);
  }

  const getReadableValue = (fieldValue: any, formField: any, choices: any) => {

    //  it means that value has been selected from csv-list.
    if (formField && formField.control && formField.control.appearance && formField.control.appearance.includes('search')) {
      const processedStringArray = formField.control.appearance.match(
        /\([^\)]+\)/i
      ) || [''];
      let params = processedStringArray[0];

      if (params.length > 2) {
        params = params.substring(1, params.length - 1);
        const csvName = params.split(',')[0].replaceAll('\'', '');
        
        console.log(formField, fieldValue);
        const csvChoices = choices.formChoices[`${csvName}.csv`];
        console.log('--------------choices -------------------');
        console.log(csvChoices);
        console.log('--------csvname :', csvName);
        let result = csvChoices.find((option: any)=> String(option[formField.children[0].name]).trim() == String(fieldValue).trim());
        console.log('--------result :', result);
        if(result === undefined) return ' -- ';
        else {
          result = result[formField.children[0].label['English']];
          return result;
        }
      }
    } 
    else if(formField.type === SELECT_ONE || formField.type === SELECT_ALL) {
      // console.log('----------in select one -----------------');
      // console.log(fieldValue, formField);
      for (let i=0; i<choices.simpleFormChoice.length; i++) {
        const choice = choices.simpleFormChoice[i];

        if( choice.field_name.includes(formField.name) && String(choice.value_text).trim() == String(fieldValue).trim()) {
          choice.value_label = JSON.parse(choice.value_label);
          console.log('--- got it: ', formField.name, fieldValue);
          if(typeof choice.value_label === 'string') return choice.value_label;
          else if(typeof choice.value_label === 'object') {
            console.log('ans: ',choice.value_label.English);
            return choice.value_label.English;
          }
        }
      }
    } 
    else {
      return typeof fieldValue == 'string' ? fieldValue : JSON.stringify(fieldValue);
    }
  }

  React.useEffect(() => {
    comUpdate();
  }, [])

  return (
    <div style={{ marginBottom: 20 }}>
      <hr className={classes.hrTag} />
      <div style={{ textAlign: 'center' }}>
        <h3 className={classes.header}> Submitted Form Details </h3>
      </div>
      <hr className={classes.hrTag} />
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          User Details
        </AccordionSummary>
        <AccordionDetails style={{ display: 'contents' }}>
          <div style={{ padding: 15 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell key={'col-label-1'} className="initialism text-uppercase text-nowrap">
                      Date
                    </TableCell>
                    <TableCell key={'col-label-2'} className="initialism text-uppercase text-nowrap">
                      User
                    </TableCell>
                    <TableCell key={'col-label-3'} className="initialism text-uppercase text-nowrap">
                      Details
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell key={'col-label-1'} className="initialism text-uppercase text-nowrap">
                      {userData != null ? userData.submission_date : ''}
                    </TableCell>
                    <TableCell key={'col-label-2'} className="initialism text-uppercase text-nowrap">
                      {userData != null ? userData.submitted_by : ''}
                    </TableCell>
                    <TableCell key={'col-label-3'} className="initialism text-uppercase text-nowrap">
                      Details
                      </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </AccordionDetails>
      </Accordion>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          Form Data
        </AccordionSummary>
        <AccordionDetails style={{ display: 'contents' }}>
          <div style={{ padding: 15 }}>
            <TableContainer style={{ maxHeight: 400, overflowX: 'hidden' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell key={'col-label-1'} className="initialism text-uppercase text-nowrap">
                      Attribute Name
                    </TableCell>
                    <TableCell key={'col-label-2'} className="initialism text-uppercase text-nowrap">
                      Attribut Value
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.length && formData.map((rowObj: any, index: number) => {
                    if (rowObj.label) {
                      return (
                        <TableRow>
                          <TableCell key={'col-label-1' + index} className="text-nowrap" style={{ verticalAlign: 'baseline' }}>
                            {rowObj.label['English']}
                          </TableCell>
                          <TableCell key={'col-label-2' + index} className="initialism text-uppercase" style={{ wordBreak: 'break-word' }}>
                            {rowObj.value}
                          </TableCell>
                        </TableRow>
                      )
                    }
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </AccordionDetails>
      </Accordion>
    </div>
  );
}

export default withRouter(FormDetails);