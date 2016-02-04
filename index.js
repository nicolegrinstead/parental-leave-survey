var express = require('express');
var app = express();
var pg = require('pg');
var bodyParser = require('body-parser')
var escape = require("html-escape"); 

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser());
// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('index', {survey:{}, errors:{}});
});

app.get('/about', function(request, response) {
  response.render('about');
});

app.get('/results', function(request, response) {
  var url = process.env.DATABASE_URL;
  pg.connect(url, function(err, client, done) {
    if (err) throw err;
    client.query("select survey_id, company_name, pronoun, weeks_taken, leave_type, paid_weeks, percent_pay, unpaid_weeks from survey join leave_weeks using (survey_id) where moderated = true ", [], function(err, result) {
      done();
      if(!err) {
        response.render('results', {survey:aggregateCompleteResults(result), error:false});
      } else {
        response.render('results', {error:"hmm... something went wrong, please check back later."});
      }
    });
  });
});

/*app.get('/complete-results', function(request, response) {
  var url = process.env.DATABASE_URL;
  pg.connect(url, function(err, client, done) {
    if (err) throw err;
    client.query("select survey_id, company_name, pronoun, pronoun_other, age_range, weeks_taken, equity, equity_other, equal_leave, equal_leave_other, on_ramp, on_ramp_other, female_vp_leave, male_vp_leave, backup_child_care, backup_child_care_other, breast_pumps, breast_pumps_other, cryo_pres, cryo_pres_other, flex_time_other, child_care_other, other_info, email ,leave_type, paid_weeks, percent_pay, unpaid_weeks, string_agg(distinct(f.flex_time),'/') as flex_time, string_agg(distinct(c.child_care),'/') as child_care from survey s left join flex_time f using (survey_id) left join child_care c using (survey_id) join leave_weeks l using (survey_id) group by survey_id, company_name, pronoun, pronoun_other, age_range, weeks_taken, equity, equity_other, equal_leave, equal_leave_other, on_ramp, on_ramp_other, female_vp_leave, male_vp_leave, backup_child_care, backup_child_care_other, breast_pumps, breast_pumps_other, cryo_pres, cryo_pres_other, flex_time_other, child_care_other, other_info, email, leave_type, paid_weeks, percent_pay, unpaid_weeks", [], function(err, result) {
      done();
      if(!err) {
        response.render('results', {survey:aggregateCompleteResults(result), error:false});
      } else {
        response.render('results', {error:"hmm... something went wrong, please check back later."});
      }
    });
  });
});*/

app.get('/survey-submit', function(request, response) {
  response.render('index', {survey:{}, errors:{}});
});

app.post('/survey-submit', function(request, response) {
  var survey = request.body.survey;
  var errors = validateSurvey(survey);
  survey = cleanData(survey);
  if (errors.hasErrors){
    response.render('index', {survey:survey, errors:errors});
  } else {
    saveSurvey(survey);
    response.render('thank-you');   
  }
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

function aggregateCompleteResults(result){
  var aggResult = {};
  for(var i=0; i<result.rowCount; i++){
    var surveyId = result.rows[i].survey_id;
    if(!aggResult[surveyId]){ //new row
      aggResult[surveyId] = 
      {
        companyName: escape(result.rows[i].company_name), 

        pronoun: escape(result.rows[i].pronoun), 
        pronounOther: escape(result.rows[i].pronoun_other), 

        ageRange: escape(result.rows[i].age_range), 

        leaveWeeksTaken: escape(result.rows[i].weeks_taken),

        equity: escape(result.rows[i].equity), 
        equityOther: escape(result.rows[i].equity_other), 

        equaLeave: escape(result.rows[i].equal_leave), 
        equalLeaveOther: escape(result.rows[i].equal_leave_other), 

        flexTime: escape(result.rows[i].flex_time), 
        flexTimeOther: escape(result.rows[i].flex_time_other), 

        onRamp: escape(result.rows[i].on_ramp), 
        onRampOther: escape(result.rows[i].on_ramp_other), 

        femaleVpLeave: escape(result.rows[i].female_vp_leave), 
        maleVpLeave: escape(result.rows[i].male_vp_leave), 

        childCare: escape(result.rows[i].child_care), 
        childCareOther: escape(result.rows[i].child_care_other), 

        backupChildCare: escape(result.rows[i].backup_child_care),
        backupChildCareOther: escape(result.rows[i].backup_child_care_other), 

        breastPumps: escape(result.rows[i].breast_pumps), 
        breastPumpsOther: escape(result.rows[i].breast_pumps_other), 

        cryoPreservation: escape(result.rows[i].cryo_pres), 
        cryoPresOther: escape(result.rows[i].cryo_pres_other), 

        otherInfo: escape(result.rows[i].other_info), 
        email: escape(result.rows[i].email)      
      };
    } 
    if(result.rows[i].leave_type == 'maternity'){
      aggResult[surveyId].maternityPaidWeeks = escape(result.rows[i].paid_weeks);
      aggResult[surveyId].maternityPercentPay = escape(result.rows[i].percent_pay);
      aggResult[surveyId].maternityUnpaidWeeks = escape(result.rows[i].unpaid_weeks);
    } else if(result.rows[i].leave_type == 'paternity'){
      aggResult[surveyId].paternityPaidWeeks = escape(result.rows[i].paid_weeks);
      aggResult[surveyId].paternityPercentPay = escape(result.rows[i].percent_pay);
      aggResult[surveyId].paternityUnpaidWeeks = escape(result.rows[i].unpaid_weeks);      
    } else if(result.rows[i].leave_type == 'adoptive'){
      aggResult[surveyId].adoptivePaidWeeks = escape(result.rows[i].paid_weeks);
      aggResult[surveyId].adoptivePercentPay = escape(result.rows[i].percent_pay);
      aggResult[surveyId].adoptiveUnpaidWeeks = escape(result.rows[i].unpaid_weeks);      
    } 
  }

console.log(aggResult);
/*for (var i=0;i<aggResult.length;i++){
console.log(aggResult[i]); 
}*/
  return aggResult;
}

function validateSurvey(survey){ 
  var errors = {messages:[]};
  if(!survey.companyName || survey.companyName.length > 250){ 
    errors.messages.push("Please provide a company name");
    errors.companyName = true;
  } 
  if(!survey.age || survey.age.length > 10){ 
    errors.messages.push("Please provide your age range");
    errors.age = true;
  } 
  if(!survey.pronoun || survey.pronoun.length > 9){ 
    errors.messages.push("Please provide your preferred pronoun");
    errors.pronoun = true;
  } 
  if(!survey.leaveType || survey.leaveType.length == 0){ 
    errors.messages.push("Please provide at least one leave type");
    errors.leaveType = true;
  } 
  errors.hasErrors = errors.messages.length > 0;
  return errors;
}

function cleanData(survey){
  for(key in survey){ 
    if(survey.hasOwnProperty(key)){
      if(!key.match(/(companyName|leaveType|emailAddress|other)/i) && survey[key].length > 10){
        survey[key] = null; 
      } 
      if (key.match(/(week|percent|vpleave)/i) && !Number(survey[key])){ 
        survey[key] = null;
      }
      if(key.match(/(companyName|leaveType|emailAddress|other)/i) && survey[key].length > 250){
        survey[key] = survey[key].substring(0,250);       
      }
    }
  }
  return survey; 
}

function saveSurvey(survey){
  var url = process.env.DATABASE_URL;
  pg.connect(url, function(err, client, done) {
    if (err) {
      console.log("Error occured inserting data "+survey+" error was "+err);
    } else {
      client.query('insert into survey (company_name, pronoun, age_range, weeks_taken, equity, equal_leave, on_ramp, female_vp_leave, male_vp_leave, backup_child_care, breast_pumps, cryo_pres, pronoun_other, equity_other, equal_leave_other, flex_time_other, on_ramp_other, child_care_other, backup_child_care_other, breast_pumps_other, cryo_pres_other, other_info, email) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) RETURNING survey_id ', 
        [survey.companyName, survey.pronoun, survey.age, survey.weeksTaken, survey.equity, survey.equalLeave, survey.onRamp, survey.femaleVpLeave, survey.maleVpLeave, survey.backupChildCare, survey.breastPumps, survey.cryoPres, survey.pronounOther, survey.equityOther, survey.equalLeaveOther, survey.flexTimeOther, survey.onRampOther, survey.childCareOther, survey.backupChildCareOther, survey.breastPumpsOther, survey.cryoPresOther, survey.otherInfo, survey.emailAddress],
        function(err, result) { 
          done(); //release connection  
          if (!err){
            var surveyId = result.rows[0].survey_id;
            if (survey.flexTime){
              var flexTime = wrapArray(survey.flexTime);
              for(var i=0; i<flexTime.length; i++){ 
                client.query('insert into flex_time (survey_id, flex_time) values ($1, $2) ', [surveyId, flexTime[i]], function(err, result) { done(); });
              }
            }
            if (survey.childCare){
              var childCare = wrapArray(survey.childCare);
              for(var i=0; i<childCare.length; i++){ 
                client.query('insert into child_care (survey_id, child_care) values ($1, $2) ', [surveyId, childCare[i]], function(err, result) { done(); });
              } 
            }
            var leaveType = wrapArray(survey.leaveType);
            for(var i=0; i<leaveType.length; i++){ 
              client.query('insert into leave_weeks (survey_id, leave_type, paid_weeks, percent_pay, unpaid_weeks) values ($1, $2, $3, $4, $5) ', 
                [surveyId, leaveType[i], survey[leaveType[i]+"PaidWeeks"], survey[leaveType[i]+"PercentPay"], survey[leaveType[i]+"UnPaidWeeks"]], function(err, result) { done(); });
            } 
          } else {
            console.log('Error! '+err);
          }
      });
    }
  });
}

function wrapArray(item){ 
  return Array.isArray(item) ? item : [item];
}
