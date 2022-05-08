import digitalOceanApp from "../../digital_ocean.app.mjs";

export default {
  key: "digital_ocean-create-snapshot",
  name: "Create Snapshot",
  description: "Creates an snapshot from a droplet",
  version: "0.2.2",
  type: "action",
  props: {
    digitalOceanApp,
    snapshot_name: {
      label: "Snapshot name",
      type: "string",
      description: "The name to give the new snapshot",
      optional: true,
    },
    droplet_id: {
      label: "Droplet",
      type: "string",
      description: "The unique identifier of Droplet to snapshot.",
      async options() {
        return this.digitalOceanApp.fetchDropletOps();
      },
    },
  },
  async run({ $ }) {
    const api = this.digitalOceanApp.digitalOceanWrapper();
    const newSnapshotData = {
      type: "snapshot",
      name: this.snapshot_name,
    };
    const response = await api.droplets.requestAction(this.droplet_id, newSnapshotData);
    $.export("$summary", `Successfully enqueued action to ${response.action.type}.`);
    return response;
  },
};
