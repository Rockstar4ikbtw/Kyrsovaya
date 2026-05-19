using autosalon.Data;
using autosalon.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace autosalon.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ReportsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var reports = await _db.Reports.ToListAsync();

            return Ok(reports);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var report = await _db.Reports.FindAsync(id);

            if (report == null)
                return NotFound();

            return Ok(report);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Report report)
        {
            _db.Reports.Add(report);

            await _db.SaveChangesAsync();

            return Ok(report);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Report updated)
        {
            var report = await _db.Reports.FindAsync(id);

            if (report == null)
                return NotFound();

            report.Period = updated.Period;
            report.DateFrom = updated.DateFrom;
            report.DateTo = updated.DateTo;
            report.TotalSales = updated.TotalSales;
            report.TotalRevenue = updated.TotalRevenue;
            report.TotalPayments = updated.TotalPayments;
            report.Notes = updated.Notes;

            await _db.SaveChangesAsync();

            return Ok(report);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var report = await _db.Reports.FindAsync(id);

            if (report == null)
                return NotFound();

            _db.Reports.Remove(report);

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}