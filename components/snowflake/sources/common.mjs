import snowflake from "../snowflake.app.mjs";
import { DEFAULT_POLLING_SOURCE_TIMER_INTERVAL } from "@pipedream/platform";

export default {
  dedupe: "unique",
  props: {
    snowflake,
    db: "$.service.db",
    timer: {
      description: "Watch for changes on this schedule",
      type: "$.interface.timer",
      default: {
        intervalSeconds: DEFAULT_POLLING_SOURCE_TIMER_INTERVAL,
      },
    },
  },
  methods: {
    async processCollection(statement, timestamp) {
      const rowStream = await this.snowflake.getRows(statement);
      this.$emit({
        rows: rowStream,
        timestamp,
      });
    },
    async processSingle(statement, timestamp) {
      let lastResultId;
      let rowCount = 0;
      const rowStream = await this.snowflake.getRows(statement);
      for await (const row of rowStream) {
        const meta = this.generateMeta({
          row,
          timestamp,
        });
        this.$emit(row, meta);

        lastResultId = row[this.uniqueKey];
        ++rowCount;
      }

      return {
        lastResultId,
        rowCount,
      };
    },
    filterAndEmitChanges(results, objectType, objectsToEmit) {
      for (const result of results) {
        const {
          QUERY_TEXT: queryText,
          QUERY_ID: queryId,
          EXECUTION_STATUS: queryStatus,
          START_TIME: queryStartTime,
          QUERY_TYPE: queryType,
          USER_NAME: userExecutingQuery,
        } = result;

        // Filter out queries that did not succeed
        if (queryStatus !== "SUCCESS") {
          continue;
        }

        // Filter out queries that don't match the selected resources, if present
        // eslint-disable-next-line no-useless-escape
        const queryRegex = new RegExp(".*IDENTIFIER\\(\\s*'(?<warehouse>.*?)'\\s*\\)|.*IDENTIFIER\\(\\s*\"(?<warehouse2>.*?)\"\\s*\\)|.*(\\bwarehouse\\s+(?<warehouse3>\\w+))", "i");
        const match = queryText.match(queryRegex);
        console.log(JSON.stringify(match, null, 2));
        const { groups } = match;
        const objectName = groups.warehouse ?? groups.warehouse2 ?? groups.warehouse3;
        console.log(`Matched ${objectType} name: ${objectName}`);
        if (!objectName) continue;
        const formattedObjectName = objectName.replace(/^"|^'|"$|'$/g, "");
        if (objectsToEmit && formattedObjectName && !objectsToEmit.includes(formattedObjectName)) {
          continue;
        }

        console.log(`Emitting ${queryType} ${objectType} ${formattedObjectName}`);

        // Emit the event
        this.$emit({
          objectType,
          objectName: formattedObjectName,
          queryId,
          queryText,
          queryStartTime,
          userExecutingQuery,
          details: result,
        }, {
          id: queryId,
          summary: `${queryType} ${objectType} ${formattedObjectName}`,
          ts: +queryStartTime,
        });
      }
    },
    async watchObjectsAndEmitChanges(objectType, objectsToEmit) {
      // Get the timestamp of the last run, if available. Else set the start time to 1 day ago
      const lastRun = this.db.get("lastMaxTimestamp") ?? +Date.now() - (1000 * 60 * 60 * 24);
      console.log(`Max ts of last run: ${lastRun}`);

      const newMaxTs = await this.snowflake.maxQueryHistoryTimestamp();
      console.log(`New max ts: ${newMaxTs}`);

      const results = await this.snowflake.getChangesForSpecificObject(
        lastRun,
        newMaxTs,
        objectType,
      );
      console.log(`Raw results: ${JSON.stringify(results, null, 2)}`);
      this.filterAndEmitChanges(results, objectType, objectsToEmit);
      await this.db.set("lastMaxTimestamp", newMaxTs);
    },
    getStatement() {
      throw new Error("getStatement is not implemented");
    },
    generateMeta() {
      throw new Error("generateMeta is not implemented");
    },
    generateMetaForCollection() {
      throw new Error("generateMetaForCollection is not implemented");
    },
    processEvent() {
      throw new Error("processEvent is not implemented");
    },
  },
  async run(event) {
    const { timestamp } = event;
    const statement = this.getStatement(event);
    return this.emitIndividualEvents === true
      ? this.processSingle(statement, timestamp)
      : this.processCollection(statement, timestamp);
  },
};
