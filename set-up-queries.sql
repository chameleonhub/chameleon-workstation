CREATE TABLE users( user_id INTEGER PRIMARY KEY, username TEXT NOT NULL, pass TEXT NOT NULL);
CREATE TABLE app( app_id INTEGER PRIMARY KEY, app_name TEXT NOT NULL, definition TEXT NOT NULL);
CREATE TABLE forms( form_id INTEGER PRIMARY KEY, form_name TEXT NOT NULL, definition TEXT NOT NULL);
CREATE TABLE lists( list_id INTEGER PRIMARY KEY, list_name TEXT NOT NULL, filter_definition TEXT, table_definition TEXT);
CREATE TABLE data( data_id INTEGER PRIMARY KEY, form_id INTEGER NOT NULL, data TEXT NOT NULL);
INSERT INTO app(app_name, definition) VALUES("bahis",'{"children":[{"children":[{"type":"form","name":"inside-ai-form","label":{"english":"inside-ai-form","bangla":"inside-ai-form"},"form_id":2,"img_id":5},{"type":"list","name":"inside-ai-list","label":{"english":"inside-ai-list","bangla":"inside-ai-list"},"list_id":2,"img_id":6}],"type":"container","name":"inside-ai","label":{"english":"inside-ai","bangla":"inside-ai"},"img_id":2},{"type":"form","name":"ai-form","label":{"english":"ai-form","bangla":"ai-form"},"form_id":1,"img_id":3},{"type":"list","name":"ai-list","label":{"english":"ai-list","bangla":"ai-list"},"list_id":1,"img_id":4}],"type":"container","name":"main-menu","label":{"english":"ai","bangla":"ai"},"img_id":1}');
INSERT INTO forms(form_name, definition) VALUES("IPT Show Review",'{"default_language":"Bangla","id_string":"event_ipt_show_review","children":[{"name":"start","type":"start"},{"name":"end","type":"end"},{"name":"username","type":"username"},{"control":{"appearance":"db"},"name":"event_id","bind":{"readonly":"TRUE"},"label":{"Bangla":"\u0987\u09ad\u09c7\u09a8\u09cd\u099f \u0986\u0987 \u09a1\u09bf","English":"Event ID"},"type":"text"},{"children":[{"name":"participant_name","bind":{"required":"yes"},"label":{"Bangla":"\u0985\u0982\u09b6\u0997\u09cd\u09b0\u09b9\u09a3\u0995\u09be\u09b0\u09c0\u09b0 \u09a8\u09be\u09ae","English":"Participant\u2019s Name"},"type":"text"},{"name":"age","bind":{"required":"yes"},"label":{"Bangla":"\u09ac\u09df\u09b8","English":"Age"},"type":"integer"},{"children":[{"name":"1","label":{"Bangla":"\u09b9\u09cd\u09af\u09be\u0981","English":"Yes"}},{"name":"0","label":{"Bangla":"\u09a8\u09be","English":"No"}}],"name":"eu_returnee","bind":{"required":"yes"},"label":{"Bangla":"EU Returnee","English":"EU Returnee"},"type":"select one"},{"children":[{"name":"1","label":{"Bangla":"\u09aa\u09c1\u09b0\u09c1\u09b7","English":"Male"}},{"name":"2","label":{"Bangla":"\u09a8\u09be\u09b0\u09c0","English":"Female"}},{"name":"99","label":{"Bangla":"\u0985\u09a8\u09cd\u09af\u09be\u09a8\u09cd\u09af","English":"Other"}}],"name":"gender","bind":{"required":"yes"},"label":{"Bangla":"\u09b2\u09bf\u0999\u09cd\u0997","English":"Sex"},"type":"select one"},{"name":"event_messages","hint":{"Bangla":"(Probe: Reintegration, remittance management, financial literacy and safe migration).","English":"(Probe: Reintegration, remittance management, financial literacy and safe migration)."},"bind":{"required":"yes"},"label":{"Bangla":"\u0986\u09aa\u09a8\u09bf \u09af\u09c7 \u0986\u0987\u09aa\u09bf\u099f\u09bf \u09b6\u09cb \u09a6\u09c7\u0996\u09c7\u099b\u09c7\u09a8 \u09a4\u09be\u09a4\u09c7 \u0995\u09bf \u09a7\u09b0\u09a8\u09c7\u09b0 \u09a4\u09a5\u09cd\u09af \u09ac\u09be \u09ae\u09c7\u09b8\u09c7\u099c \u09aa\u09cd\u09b0\u09a6\u09be\u09a8 \u0995\u09b0\u09be \u09b9\u09df\u09c7\u099b\u09c7? (\u09aa\u09cd\u09b0\u09cb\u09ac \u0995\u09b0\u09c1\u09a8- \u09b0\u09bf\u0987\u09a8\u099f\u09cd\u09b0\u09bf\u0997\u09c7\u09b6\u09a8, \u09b0\u09c7\u09ae\u09bf\u099f\u09cd\u09af\u09be\u09a8\u09cd\u09b8 \u09ac\u09cd\u09af\u09ac\u09b8\u09cd\u09a5\u09be\u09aa\u09a8\u09be, \u09ab\u09be\u0987\u09a8\u09cd\u09af\u09be\u09a8\u09cd\u09b8\u09bf\u09df\u09be\u09b2 \u09b2\u09bf\u099f\u09be\u09b0\u09bf\u09b8\u09bf \u098f\u09ac\u0982 \u09b8\u09c7\u09ab \u09ae\u09be\u0987\u0997\u09cd\u09b0\u09c7\u09b6\u09a8)","English":"What were the messages or issues delivered in the IPT show?"},"type":"text"},{"name":"evnet_messages_uses_in_life","bind":{"required":"yes"},"label":{"Bangla":"\u0986\u09aa\u09a8\u09bf \u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09cd\u09af\u09be\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u099c\u09c0\u09ac\u09a8\u09c7 \u098f\u0987 \u09a4\u09a5\u09cd\u09af \u09ac\u09be \u09ae\u09c7\u09b8\u09c7\u099c \u0995\u09bf\u09ad\u09be\u09ac\u09c7 \u0995\u09be\u099c\u09c7 \u09b2\u09be\u0997\u09ac\u09c7\u09a8?","English":"How do you intend to use these messages in your personal life?"},"type":"text"},{"name":"evnet_messages_not_clear","bind":{"required":"yes"},"label":{"Bangla":"\u09a8\u09be\u099f\u0995 \u09b6\u09cb\u09a4\u09c7 \u098f\u09ae\u09a8 \u0995\u09bf\u099b\u09c1 \u09a4\u09a5\u09cd\u09af \u09ac\u09be \u09ae\u09c7\u09b8\u09c7\u099c \u0989\u09b2\u09cd\u09b2\u09c7\u0996 \u0995\u09b0\u09be \u09b9\u09df\u09c7\u099b\u09c7 \u09af\u09be \u0986\u09aa\u09a8\u09be\u09b0 \u0995\u09be\u099b\u09c7 \u09aa\u09b0\u09bf\u09b8\u09cd\u0995\u09be\u09b0 \u09a8\u09df? (\u09aa\u09cd\u09b0\u09cb\u09ac \u0995\u09b0\u09c1\u09a8:)","English":"What was mentioned in the IPT show that was not clear to you? (Probe)"},"type":"text"},{"name":"event_improvement_area","bind":{"required":"yes"},"label":{"Bangla":"\u09a8\u09be\u099f\u0995\u099f\u09bf\u09a4\u09c7 \u09ae\u09c2\u09b2\u09a4 \u098f\u09ae\u09a8 \u0995\u09cb\u09a8\u09cb \u099c\u09be\u09df\u0997\u09be \u0986\u099b\u09c7 (\u09b8\u0982\u09af\u09cb\u099c\u09a8 \u09ac\u09be \u09ac\u09be\u09a6) \u09a6\u09bf\u09b2\u09c7 \u09ad\u09ac\u09bf\u09b7\u09ce \u09a8\u09be\u099f\u0995\u099f\u09bf \u0986\u09b0\u0993 \u0989\u09a8\u09cd\u09a8\u09a4 \u09b9\u09ac\u09c7?","English":"What are the key areas that need to be improved in future IPT shows?"},"type":"text"},{"name":"event_preferred_time","bind":{"required":"yes"},"label":{"Bangla":"\u09af\u09a6\u09bf \u0986\u0987\u09aa\u09bf\u099f\u09bf \u09b6\u09cb \u09ac\u09be \u09a8\u09be\u099f\u0995\u09c7\u09b0 \u09b8\u09ae\u09df \u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8 \u0995\u09b0\u09be \u09b9\u09df \u09a4\u09be\u09b9\u09b2\u09c7 \u0986\u09aa\u09a8\u09be\u09b0 \u09ae\u09a4\u09c7 \u0995\u09cb\u09a8 \u09b8\u09ae\u09df\u099f\u09bf \u0986\u0987\u09aa\u09bf\u099f\u09bf \u09b6\u09cb \u09ac\u09be \u09a8\u09be\u099f\u0995 \u09a6\u09c7\u0996\u09be\u09a8\u09cb\u09b0 \u099c\u09a8\u09cd\u09af \u0989\u09aa\u09af\u09c1\u0995\u09cd\u09a4 \u09b8\u09ae\u09df?","English":"If timing of the IPT show could be changed, what would be your preferred time?"},"type":"text"},{"name":"remarks","label":{"Bangla":"\u09af\u09a6\u09bf \u09a8\u09be\u099f\u0995\u099f\u09bf \u09b8\u09ae\u09cd\u09aa\u09b0\u09cd\u0995\u09c7 \u0986\u09aa\u09a8\u09be\u09b0 \u0986\u09b0\u09cb \u0995\u09cb\u09a8\u09cb \u09ae\u09a8\u09cd\u09a4\u09ac\u09cd\u09af \u09a5\u09be\u0995\u09c7 \u09a4\u09be\u09b9\u09b2\u09c7 \u0986\u09aa\u09a8\u09bf \u09ac\u09b2\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u09a8?","English":"Additional comments if any:"},"type":"text"}],"name":"event","type":"repeat"},{"control":{"bodyless":true},"children":[{"name":"instanceID","bind":{"readonly":"true()","calculate":"concat(''uuid:'', uuid())"},"type":"calculate"}],"name":"meta","type":"group"}],"version":"1.0.1","type":"survey","name":"event_ipt_show_review","sms_keyword":"event_ipt_show_review","title":"IPT Show Review"}');
INSERT INTO forms(form_name, definition) VALUES("All widgets",'{"default_language":"Bangla","id_string":"event_school_quiz","children":[{"name":"start","type":"start"},{"name":"end","type":"end"},{"name":"username","type":"username"},{"name":"note1","label":{"Bangla":"\u09b8\u09cd\u0995\u09c1\u09b2 \u0995\u09c1\u0987\u099c \u09aa\u09cd\u09b2\u09cd\u09af\u09be\u09a8\u09bf\u0982","English":"School Quiz Planning"},"type":"note"},{"control":{"appearance":"field-list"},"children":[{"name":"event_start_time","bind":{"required":"yes"},"label":{"Bangla":"\u0987\u09ad\u09c7\u09a8\u09cd\u099f \u09b6\u09c1\u09b0\u09c1 \u09b9\u09ac\u09be\u09b0 \u09b8\u09ae\u09df","English":"Event Start TIme"},"type":"datetime"},{"name":"event_end_time","bind":{"required":"yes"},"label":{"Bangla":"\u0987\u09ad\u09c7\u09a8\u09cd\u099f \u09b6\u09c1\u09b0\u09c1 \u09b9\u09ac\u09be\u09b0 \u09b8\u09ae\u09df","English":"Event End Time"},"type":"datetime"}],"name":"event","type":"group"},{"control":{"appearance":"field-list"},"children":[{"control":{"appearance":"search(''geo'')"},"children":[{"name":"division_code","label":{"Bangla":"division_name","English":"division_name"}}],"name":"division","bind":{"required":"Yes"},"label":{"Bangla":"\u09ac\u09bf\u09ad\u09be\u0997","English":"Division"},"type":"select one"},{"control":{"appearance":"search(''geo'', ''matches'', ''division_code'', ${division})"},"children":[{"name":"district_code","label":{"Bangla":"district_name","English":"district_name"}}],"name":"district","bind":{"relevant":"${division}","required":"Yes"},"label":{"Bangla":"\u099c\u09c7\u09b2\u09be","English":"District"},"type":"select one"},{"control":{"appearance":"search(''geo'', ''matches'', ''district_code'', ${district})"},"children":[{"name":"upazila_code","label":{"Bangla":"upazila_name","English":"upazila_name"}}],"name":"upazila","bind":{"relevant":"${district}","required":"Yes"},"label":{"Bangla":"\u0989\u09aa\u099c\u09c7\u09b2\u09be","English":"Upazila"},"type":"select one"},{"control":{"appearance":"search(''geo'', ''matches'', ''upazila_code'', ${upazila})"},"children":[{"name":"union_code","label":{"Bangla":"union_name","English":"union_name"}}],"name":"union","bind":{"relevant":"${upazila}","required":"Yes"},"label":{"Bangla":"\u0987\u0989\u09a8\u09bf\u09df\u09a8","English":"Union"},"type":"select one"},{"name":"village","bind":{"required":"yes"},"label":{"Bangla":"\u0997\u09cd\u09b0\u09be\u09ae","English":"Village"},"type":"text"},{"name":"para_bazar_school","bind":{"required":"yes"},"label":{"Bangla":"\u09aa\u09be\u09dc\u09be/\u09ac\u09be\u099c\u09be\u09b0/\u09b8\u09cd\u0995\u09c1\u09b2 \u09a8\u09be\u09ae","English":"Para/Bazar/School Name"},"type":"text"}],"name":"geo","label":{"Bangla":"\u09ad\u09cc\u0997\u09b2\u09bf\u0995 \u09a4\u09a5\u09cd\u09af","English":"Basic geographical information"},"type":"group"},{"name":"remarks","label":{"Bangla":"\u09ae\u09a8\u09cd\u09a4\u09ac\u09cd\u09af","English":"Comment"},"type":"text"},{"control":{"bodyless":true},"children":[{"name":"instanceID","bind":{"readonly":"true()","calculate":"concat(''uuid:'', uuid())"},"type":"calculate"}],"name":"meta","type":"group"}],"version":"1.0.1","type":"survey","name":"event_school_quiz","sms_keyword":"event_school_quiz","title":"School Quiz Planning"}');
INSERT INTO lists(list_name, filter_definition) VALUES ("Sample List", '[{"type":"text","label":{"english":"Sample Text"},"name":"sample_text","dependency":[]},{"type":"number","label":{"english":"Sample Number"},"name":"sample_number","dependency":[]},{"type":"date","label":{"english":"Sample Date"},"name":"sample_date","dependency":[]},{"type":"select one","label":{"english":"Sample select one"},"name":"sample_select_one","dependency":[]},{"type":"select one","label":{"english":"Sample dependent select one"},"name":"sample_select_one_v1","dependency":["sample_select_one"]},{"type":"select all that apply","label":{"english":"Sample select multiple"},"name":"sample_select_multiple","dependency":[]},{"type":"select all that apply","label":{"english":"Sample dependent select multiple"},"name":"sample_select_multiple_v1","dependency":["sample_select_multiple"]}]');