import { TextField } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import { FORM_TITLE } from './constants';
import { appSignInFormStyles } from './styles';

// AppSignInForm props interface
interface AppSignInFormProps {
  setFieldValueHandler: (fieldName: string, fieldValue: any) => void;
}

// AppSignInForm component
export default function AppSignInForm(props: AppSignInFormProps) {
  const classes = appSignInFormStyles();
  const { setFieldValueHandler } = props;
  const onChangeHandler = (event: any) => {
    setFieldValueHandler(event.target.name, event.target.value);
  };
  return (
    <div className={classes.layout}>
      <Typography variant="h6" gutterBottom={true}>
        {FORM_TITLE}
      </Typography>
      <Grid container={true} spacing={3}>
        <Grid item={true} xs={12}>
          <TextField
            required={true}
            id="username"
            name="username"
            label="Username"
            variant="outlined"
            onChange={onChangeHandler}
          />
        </Grid>
        <Grid item={true} xs={12}>
          <TextField
            required={true}
            id="password"
            name="password"
            type="password"
            label="Password"
            variant="outlined"
            onChange={onChangeHandler}
          />
        </Grid>
      </Grid>
    </div>
  );
}
