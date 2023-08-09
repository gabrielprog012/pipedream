import { defineAction } from "@pipedream/types";
import app from "../../app/zoho_assist.app";
import { GetSessionReportsParams } from "../../common/types";
import { GET_SESSION_REPORTS_TYPE_OPTIONS } from "../../common/constants";

export default defineAction({
  name: "Get Session Reports",
  description: "Fetch the reports of previously conducted sessions. [See the documentation](https://www.zoho.com/assist/api/getsessionreports.html)",
  key: "zoho_assist-get-session-reports",
  version: "0.0.1",
  type: "action",
  props: {
    app,
    type: {
      propDefinition: [
        app,
        "type",
      ],
      options: GET_SESSION_REPORTS_TYPE_OPTIONS,
    },
    fromDate: {
      propDefinition: [
        app,
        "date",
      ],
      label: "From Date",
    },
    toDate: {
      propDefinition: [
        app,
        "date",
      ],
      label: "To Date",
    },
    email: {
      type: "string",
      label: "Email",
      description:
        "To fetch reports conducted by specific technician.",
      optional: true,
    },
    index: {
      type: "string",
      label: "Index",
      description:
        "Index of the record.",
      optional: true,
    },
    count: {
      type: "integer",
      label: "Count",
      description:
        "Number of rows per page.",
      optional: true,
    },
  },
  async run({ $ }) {
    const {
      type,
      fromDate,
      toDate,
      email,
      index,
      count,
    } = this;

    const getValidDate = ((str: string) => {
      const date = new Date(str);
      return isNaN(date.valueOf())
        ? str
        : Math.floor(date.valueOf() / 1000).toString();
    });

    const params: GetSessionReportsParams = {
      $,
      params: {
        type,
        fromdate: getValidDate(fromDate),
        todate: getValidDate(toDate),
        email,
        index,
        count,
      },
    };

    const { representation } = await this.app.getSessionReports(params);

    $.export("$summary", `Successfully fetched ${representation.length} session reports`);

    return representation;
  },
});
