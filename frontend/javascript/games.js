document.addEventListener('DOMContentLoaded', function () {
    var statisztikaGomb = document.getElementById('statsToggleBtn');

    if (statisztikaGomb) {
        // alapból off
        document.body.classList.add('stats-hidden');
        
        statisztikaGomb.addEventListener('click', function () {
            var aktiv = this.classList.toggle('active');

            if (aktiv) {
                document.body.classList.remove('stats-hidden');
            } else {
                document.body.classList.add('stats-hidden');
            }
        });
    }
});
