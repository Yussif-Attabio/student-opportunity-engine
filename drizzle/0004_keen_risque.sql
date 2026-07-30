CREATE TYPE "public"."career_field" AS ENUM('TECHNOLOGY', 'ENGINEERING', 'BUSINESS', 'FINANCE_ACCOUNTING', 'HEALTHCARE', 'MARKETING_COMMUNICATIONS', 'DESIGN_CREATIVE', 'EDUCATION', 'SCIENCE_RESEARCH', 'LAW_GOVERNMENT_POLICY', 'OPERATIONS_LOGISTICS', 'HOSPITALITY', 'SKILLED_TRADES', 'OTHER', 'UNKNOWN');--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "career_field" "career_field" DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
CREATE INDEX "opportunities_field_active_idx" ON "opportunities" USING btree ("career_field","is_active");--> statement-breakpoint
CREATE INDEX "opportunities_country_active_idx" ON "opportunities" USING btree ("country","is_active");--> statement-breakpoint
UPDATE "opportunities"
SET "career_field" = CASE
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(software|developer|data scientist|data engineer|machine learning|cyber|information technology|it support|product manager|technical product|cloud|devops|site reliability|security engineer)\M' THEN 'TECHNOLOGY'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(mechanical|civil|electrical|chemical|industrial|manufacturing|aerospace|structural|hardware|robotics|engineering)\M' THEN 'ENGINEERING'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(nurs[[:alnum:]_]*|medical|clinical|health[[:alnum:]_]*|pharmac[[:alnum:]_]*|therapy|therapist|patient|dental|physician|veterinary|social work)\M' THEN 'HEALTHCARE'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(finance|financial|account[[:alnum:]_]*|audit[[:alnum:]_]*|tax|banking|investment|treasury|actuari[[:alnum:]_]*|underwrit[[:alnum:]_]*)\M' THEN 'FINANCE_ACCOUNTING'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(marketing|communications?|public relations|advertis[[:alnum:]_]*|brand|content|social media|journalis[[:alnum:]_]*|editorial)\M' THEN 'MARKETING_COMMUNICATIONS'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(design|designer|creative|art director|animation|illustrat[[:alnum:]_]*|fashion|photograph[[:alnum:]_]*|video production|ux|user experience)\M' THEN 'DESIGN_CREATIVE'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(education|teacher|teaching|school|curriculum|academic|student services|instruction|tutor|learning)\M' THEN 'EDUCATION'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(research|scientist|science|laboratory|lab assistant|biology|chemist|chemistry|physics|geology|environmental)\M' THEN 'SCIENCE_RESEARCH'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(legal|law|attorney|paralegal|government|public policy|policy analyst|legislative|public affairs|compliance)\M' THEN 'LAW_GOVERNMENT_POLICY'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(operations|logistics|supply chain|procurement|warehouse|transportation|quality assurance|project coordinator)\M' THEN 'OPERATIONS_LOGISTICS'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(hospitality|hotel|restaurant|food service|culinary|tourism|guest service|event planning)\M' THEN 'HOSPITALITY'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(electrician|plumber|carpenter|welder|technician|mechanic|construction|machinist|hvac|maintenance)\M' THEN 'SKILLED_TRADES'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '))) ~ '\m(business|sales|human resources|recruit[[:alnum:]_]*|people operations|strategy|consult[[:alnum:]_]*|customer success|administrat[[:alnum:]_]*|real estate)\M' THEN 'BUSINESS'::"career_field"
  WHEN lower(concat_ws(' ', "title", array_to_string("departments", ' '), array_to_string("teams", ' '), "description_text")) ~ '\m(intern|student|graduate|apprentice|fellow)\M' THEN 'OTHER'::"career_field"
  ELSE 'UNKNOWN'::"career_field"
END;--> statement-breakpoint
UPDATE "opportunities"
SET "country" = CASE
  WHEN lower(coalesce("country", '')) IN ('us', 'usa', 'u.s.', 'u.s.a.', 'united states') THEN 'United States'
  WHEN lower(coalesce("country", '')) IN ('ca', 'can', 'canada') THEN 'Canada'
  WHEN lower(regexp_replace(coalesce("country", ''), '[^a-zA-Z]', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'england', 'scotland', 'wales', 'northernireland') THEN 'United Kingdom'
  WHEN upper(coalesce("country", '')) IN ('AU', 'AUS') THEN 'Australia'
  WHEN upper(coalesce("country", '')) IN ('IN', 'IND') THEN 'India'
  WHEN upper(coalesce("country", '')) IN ('DE', 'DEU') THEN 'Germany'
  WHEN upper(coalesce("country", '')) IN ('FR', 'FRA') THEN 'France'
  WHEN upper(coalesce("country", '')) IN ('IE', 'IRL') THEN 'Ireland'
  WHEN upper(coalesce("country", '')) IN ('NL', 'NLD') THEN 'Netherlands'
  WHEN upper(coalesce("country", '')) IN ('ES', 'ESP') THEN 'Spain'
  WHEN upper(coalesce("country", '')) IN ('PL', 'POL') THEN 'Poland'
  WHEN upper(coalesce("country", '')) IN ('SG', 'SGP') THEN 'Singapore'
  WHEN upper(coalesce("country", '')) IN ('BR', 'BRA') THEN 'Brazil'
  WHEN upper(coalesce("country", '')) IN ('MX', 'MEX') THEN 'Mexico'
  WHEN "country" IS NOT NULL AND btrim("country") <> '' THEN btrim("country")
  WHEN array_to_string("locations", ' ') ~* '\m(united states|u\.?s\.?a\.?)\M' THEN 'United States'
  WHEN array_to_string("locations", ' ') ~* '(^|, |\s)(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)(\M|$)' THEN 'United States'
  WHEN array_to_string("locations", ' ') ~* '\mcanada\M' THEN 'Canada'
  WHEN array_to_string("locations", ' ') ~* '(^|, )(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)(\M|$)' THEN 'Canada'
  WHEN array_to_string("locations", ' ') ~* '\m(united kingdom|u\.?k\.?|england|scotland|wales|northern ireland)\M' THEN 'United Kingdom'
  ELSE NULL
END;