document.addEventListener('DOMContentLoaded', function () {
    const statisztikaGomb = document.getElementById('statsToggleBtn');

    if (statisztikaGomb) {
        document.body.classList.add('stats-hidden');
        
        statisztikaGomb.addEventListener('click', function () {
            const aktiv = this.classList.toggle('active');

            if (aktiv) {
                document.body.classList.remove('stats-hidden');
            } else {
                document.body.classList.add('stats-hidden');
            }
        });
    }
});
