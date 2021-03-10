<link rel="stylesheet" type="text/css" href="<?= asset_url('assets/ext/bootstrap/css/bootstrap.min.css') ?>">
<link rel="stylesheet" href="https://cdn.datatables.net/1.10.24/css/dataTables.bootstrap5.min.css">

<style>
    .date {
        min-width: 75px;
    }

    .text {
        word-break: break-all;
    }

    a.llv-active {
        z-index: 2;
        background-color: #f5f5f5;
        border-color: #777;
    }
</style>

<script src="https://cdn.datatables.net/1.10.24/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.10.24/js/dataTables.bootstrap5.min.js"></script>

<script>
    $(document).ready(function() {

        $('.table-container tr').on('click', function() {
            $('#' + $(this).data('display')).toggle();
        });

        $('#table-log').DataTable({
            "order": [],
            "stateSave": true,
            "stateSaveCallback": function(settings, data) {
                window.localStorage.setItem("datatable", JSON.stringify(data));
            },
            "stateLoadCallback": function(settings) {
                var data = JSON.parse(window.localStorage.getItem("datatable"));
                if (data) data.start = 0;
                return data;
            }
        });
        $('#delete-log, #delete-all-log').click(function() {
            return confirm('Are you sure?');
        });
    });
</script>

<div id="logs-page" class="container-fluid backend-page">
    <div class="row">
        <div class="col-md-2 sidebar">
            <div class="list-group">
                <?php if (empty($files)) : ?>
                    <a class="list-group-item liv-active">No Log Files Found</a>
                <?php else : ?>
                    <?php foreach ($files as $file) : ?>
                        <a href="?f=<?= base64_encode($file); ?>" class="list-group-item <?= ($currentFile == $file) ? "llv-active" : "" ?>">
                            <?= $file; ?>
                        </a>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
        <div class="col-md-10 table-container">
            <?php if (is_null($logs)) : ?>
                <div>
                    <br><br>
                    <strong>Log file > 50MB, please download it.</strong>
                    <br><br>
                </div>
            <?php else : ?>
                <table id="table-log" class="table table-striped">
                    <thead>
                        <tr>
                            <th>Level</th>
                            <th>Date</th>
                            <th>Content</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($logs as $key => $log) : ?>
                            <tr data-display="stack<?= $key; ?>">
                                <td class="text-<?= $log['class']; ?>">
                                    <span class="<?= $log['icon']; ?>" aria-hidden="true"></span>
                                    &nbsp;<?= $log['level']; ?>
                                </td>
                                <td class="date"><?= $log['date']; ?></td>
                                <td class="text">
                                    <?php if (array_key_exists("extra", $log)) : ?>
                                        <a class="pull-right expand btn btn-default btn-xs" data-display="stack<?= $key; ?>">
                                            <span class="glyphicon glyphicon-search"></span>
                                        </a>
                                    <?php endif; ?>
                                    <?= $log['content']; ?>
                                    <?php if (array_key_exists("extra", $log)) : ?>
                                        <div class="stack" id="stack<?= $key; ?>" style="display: none; white-space: pre-wrap;">
                                            <?= $log['extra'] ?>
                                        </div>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
            <div>
                <?php if ($currentFile) : ?>
                    <a href="?dl=<?= base64_encode($currentFile); ?>">
                        <span class="glyphicon glyphicon-download-alt"></span>
                        Download file
                    </a>
                    -
                    <a id="delete-log" href="?del=<?= base64_encode($currentFile); ?>"><span class="glyphicon glyphicon-trash"></span> Delete file</a>
                    <?php if (count($files) > 1) : ?>
                        -
                        <a id="delete-all-log" href="?del=<?= base64_encode("all"); ?>"><span class="glyphicon glyphicon-trash"></span> Delete all files</a>
                    <?php endif; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>